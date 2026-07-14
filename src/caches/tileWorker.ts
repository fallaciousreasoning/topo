// Web Worker: owns all tile I/O that's either high-frequency (bundle downloads) or wants the
// fast synchronous OPFS write path (FileSystemSyncAccessHandle, only available inside a Worker -
// the main thread has to use the much slower createWritable() swap-file dance instead).
//
// Originally this only handled individual tile writes, dispatched one at a time from the main
// thread's downloadBundle loop. But even with fast writes, that loop itself - fetching, parsing
// the bundle stream, and a postMessage round-trip per tile - was still main-thread work for a
// download that can be hundreds of thousands of tiles. So the whole bundle download (fetch +
// parse + write) now runs in here too: the main thread just sends a URL and gets back progress/
// checkpoint/completion messages, with no per-tile hop at all.
import { parseTileCoords } from './tileCoords'
import { parseTileStream, HEADER_SIZE } from '../tilebundle/index'

export interface SaveTileRequest {
    type: 'SAVE_TILE'
    id: string
    layer: string
    path: string
    data: Uint8Array
}

export interface SaveTileResponse {
    type: 'SAVE_TILE_DONE'
    id: string
    ok: boolean
}

export interface DownloadBundleRequest {
    type: 'DOWNLOAD_BUNDLE'
    id: string
    url: string
    layerId: string
    tileExt: string
    resumeOffset: number
}

export interface CancelDownloadRequest {
    type: 'CANCEL_DOWNLOAD'
    id: string
}

export interface DownloadProgressResponse {
    type: 'DOWNLOAD_PROGRESS'
    id: string
    progress: number
    bytesDownloaded: number
}

export interface DownloadCheckpointResponse {
    type: 'DOWNLOAD_CHECKPOINT'
    id: string
    offset: number
}

export interface DownloadDoneResponse {
    type: 'DOWNLOAD_DONE'
    id: string
    tilesWritten: number
}

export interface DownloadErrorResponse {
    type: 'DOWNLOAD_ERROR'
    id: string
    error: string
}

export interface DownloadAbortedResponse {
    type: 'DOWNLOAD_ABORTED'
    id: string
}

export type WorkerRequest = SaveTileRequest | DownloadBundleRequest | CancelDownloadRequest
export type WorkerResponse =
    | SaveTileResponse
    | DownloadProgressResponse
    | DownloadCheckpointResponse
    | DownloadDoneResponse
    | DownloadErrorResponse
    | DownloadAbortedResponse

// Mirrors opfs.ts's cachedXDir: most writes come in runs sharing the same layer/z/x (extracting
// a bundle, or downloading a viewport column), so caching the last-resolved x-directory handle
// turns a multi-hop OPFS directory walk into a cache hit for every tile after the first in that run.
let cachedXDir: { layer: string, z: string, x: string, handle: FileSystemDirectoryHandle } | null = null

async function getXDir(layer: string, z: string, x: string): Promise<FileSystemDirectoryHandle> {
    if (cachedXDir && cachedXDir.layer === layer && cachedXDir.z === z && cachedXDir.x === x) {
        return cachedXDir.handle
    }
    const root = await navigator.storage.getDirectory()
    const tilesDir = await root.getDirectoryHandle('tiles', { create: true })
    const layerDir = await tilesDir.getDirectoryHandle(layer, { create: true })
    const zDir = await layerDir.getDirectoryHandle(z, { create: true })
    const xDir = await zDir.getDirectoryHandle(x, { create: true })
    cachedXDir = { layer, z, x, handle: xDir }
    return xDir
}

async function saveTile(layer: string, path: string, data: Uint8Array): Promise<boolean> {
    const coords = parseTileCoords(path)
    if (!coords) return false
    try {
        const xDir = await getXDir(layer, coords.z, coords.x)
        const fileHandle = await xDir.getFileHandle(`${coords.y}.${coords.ext}`, { create: true })
        const accessHandle = await (fileHandle as any).createSyncAccessHandle()
        try {
            accessHandle.write(data, { at: 0 })
            accessHandle.truncate(data.byteLength)
            // No explicit flush(): per spec/MDN it's only needed to force disk persistence at a
            // specific moment, and the OS handling it in its own time is fine for a best-effort
            // tile cache (worst case on a crash: an unflushed tile just gets re-downloaded).
            // Forcing a real disk sync on every single tile - hundreds of thousands per bundle -
            // was likely a big, needless cost on slower phone storage.
        } finally {
            accessHandle.close()
        }
        return true
    } catch {
        return false
    }
}

/** How many tiles to write between persisting a resumable checkpoint. */
const CHECKPOINT_TILE_INTERVAL = 100

/** How many writes to have in flight at once, so disk I/O doesn't stall the network read. */
const WRITE_CONCURRENCY = 8

/** How often to post a progress update back to the main thread, regardless of tile count. */
const PROGRESS_INTERVAL_MS = 200

const activeControllers = new Map<string, AbortController>()

async function runBundleDownload(req: DownloadBundleRequest): Promise<void> {
    const { id, url, layerId, tileExt, resumeOffset } = req
    const controller = new AbortController()
    activeControllers.set(id, controller)

    const postProgress = (progress: number, bytes: number) => {
        const msg: DownloadProgressResponse = { type: 'DOWNLOAD_PROGRESS', id, progress, bytesDownloaded: bytes }
        self.postMessage(msg)
    }

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: resumeOffset > 0 ? { Range: `bytes=${resumeOffset}-` } : undefined,
        })
        console.log('[tileWorker] fetch response:', {
            id, url, resumeOffset, status: response.status, ok: response.ok,
            contentLength: response.headers.get('content-length'),
        })
        if (!response.ok && response.status !== 206) {
            // A resume (resumeOffset > 0) sends a Range request - if the server no longer likes
            // that range (e.g. a 416, or the bundle at this URL has since changed size), this is
            // where it shows up, and it'll fail on every retry until the stale resumeOffset/record
            // is cleared, since retrying just resends the same bad Range header.
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        let bytesReceived: number
        let totalBytes: number

        if (response.status === 206) {
            // Range honoured. We'd ideally read the true total from Content-Range's "start-end/total",
            // but that header isn't in the CORS-safelisted set and R2 doesn't send
            // Access-Control-Expose-Headers, so cross-origin JS can't actually read it - it silently
            // comes back null. Content-Length *is* safelisted, and for a 206 response it's the
            // remaining byte count, so resumeOffset + that gives us the same total without relying
            // on a header the browser won't hand us.
            const remaining = parseInt(response.headers.get('content-length') ?? '0', 10)
            totalBytes = remaining > 0 ? resumeOffset + remaining : 0
            bytesReceived = resumeOffset
        } else {
            // No range requested, or the server ignored it and sent the whole file from byte 0.
            totalBytes = parseInt(response.headers.get('content-length') ?? '0', 10)
            bytesReceived = 0
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('Response body is not readable')

        let tilesWritten = 0
        const inFlight = new Set<Promise<void>>()
        let confirmedBytes = bytesReceived
        let confirmedSinceCheckpoint = 0
        let lastProgressTime = 0

        // Writes complete in whatever order the OPFS backend gets to them, not necessarily the
        // order they were dispatched in - with WRITE_CONCURRENCY > 1, a later tile can finish
        // before an earlier one. A checkpoint offset has to be the byte position of a genuinely
        // contiguous confirmed prefix of the file (so a resumed Range request lands exactly on a
        // tile-record boundary); simply summing bytes in completion order doesn't guarantee that -
        // it can count a later tile's bytes while an earlier one is still in flight, producing an
        // offset that doesn't correspond to any real record boundary (the resumed fetch then
        // starts mid-record and `decodeHeader` throws "Invalid magic"). `writeQueue` tracks
        // dispatch order so bytes only ever advance once every earlier tile is confirmed too.
        const writeQueue: { recordBytes: number, done: boolean }[] = []

        for await (const { z, x, y, data } of parseTileStream(reader)) {
            if (controller.signal.aborted) throw new DOMException('Download cancelled', 'AbortError')

            const recordBytes = HEADER_SIZE + data.length
            const entry = { recordBytes, done: false }
            writeQueue.push(entry)

            let tracked: Promise<void>
            tracked = saveTile(layerId, `/${z}/${x}/${y}.${tileExt}`, data).then(() => {
                inFlight.delete(tracked)
                entry.done = true
                while (writeQueue.length > 0 && writeQueue[0].done) {
                    confirmedBytes += writeQueue.shift()!.recordBytes
                    if (++confirmedSinceCheckpoint >= CHECKPOINT_TILE_INTERVAL) {
                        confirmedSinceCheckpoint = 0
                        const checkpoint: DownloadCheckpointResponse = { type: 'DOWNLOAD_CHECKPOINT', id, offset: confirmedBytes }
                        self.postMessage(checkpoint)
                    }
                }
            })
            inFlight.add(tracked)

            tilesWritten++
            bytesReceived += recordBytes

            const now = Date.now()
            if (now - lastProgressTime > PROGRESS_INTERVAL_MS) {
                lastProgressTime = now
                postProgress(totalBytes > 0 ? Math.min(1, bytesReceived / totalBytes) : 0, bytesReceived)
            }

            if (inFlight.size >= WRITE_CONCURRENCY) {
                await Promise.race(inFlight)
            }
        }

        await Promise.all(inFlight)
        postProgress(1, bytesReceived)

        const done: DownloadDoneResponse = { type: 'DOWNLOAD_DONE', id, tilesWritten }
        self.postMessage(done)
    } catch (err) {
        if (controller.signal.aborted) {
            console.log('[tileWorker] download aborted:', { id, url, resumeOffset })
            const aborted: DownloadAbortedResponse = { type: 'DOWNLOAD_ABORTED', id }
            self.postMessage(aborted)
        } else {
            console.error('[tileWorker] download failed:', { id, url, resumeOffset }, err)
            const error: DownloadErrorResponse = { type: 'DOWNLOAD_ERROR', id, error: String(err) }
            self.postMessage(error)
        }
    } finally {
        activeControllers.delete(id)
    }
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
    const req = event.data
    if (req.type === 'SAVE_TILE') {
        saveTile(req.layer, req.path, req.data).then(ok => {
            const response: SaveTileResponse = { type: 'SAVE_TILE_DONE', id: req.id, ok }
            self.postMessage(response)
        })
    } else if (req.type === 'DOWNLOAD_BUNDLE') {
        runBundleDownload(req)
    } else if (req.type === 'CANCEL_DOWNLOAD') {
        activeControllers.get(req.id)?.abort()
    }
})
