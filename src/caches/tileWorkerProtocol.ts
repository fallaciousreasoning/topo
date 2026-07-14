// Main-thread client for tileWorker.ts. Same request/response-by-id actor pattern as
// vectorClipProtocol.ts / compositeProtocol.ts.
import type {
    SaveTileRequest, SaveTileResponse,
    DownloadBundleRequest, CancelDownloadRequest, WorkerResponse,
} from './tileWorker'

let worker: Worker | undefined
const pendingSaves = new Map<string, () => void>()

interface DownloadHandlers {
    onProgress: (progress: number, bytesDownloaded: number) => void
    onCheckpoint?: (offset: number) => void
    resolve: (tilesWritten: number) => void
    reject: (err: unknown) => void
}
const pendingDownloads = new Map<string, DownloadHandlers>()

function getWorker(): Worker {
    if (!worker) {
        worker = new Worker(new URL('./tileWorker.ts', import.meta.url), { type: 'module' })
        worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
            const msg = event.data
            if (msg.type === 'SAVE_TILE_DONE') {
                const resolve = pendingSaves.get(msg.id)
                if (!resolve) return
                pendingSaves.delete(msg.id)
                resolve()
                return
            }

            const handlers = pendingDownloads.get(msg.id)
            if (!handlers) return
            if (msg.type === 'DOWNLOAD_PROGRESS') {
                handlers.onProgress(msg.progress, msg.bytesDownloaded)
            } else if (msg.type === 'DOWNLOAD_CHECKPOINT') {
                handlers.onCheckpoint?.(msg.offset)
            } else if (msg.type === 'DOWNLOAD_DONE') {
                pendingDownloads.delete(msg.id)
                handlers.resolve(msg.tilesWritten)
            } else if (msg.type === 'DOWNLOAD_ERROR') {
                pendingDownloads.delete(msg.id)
                handlers.reject(new Error(msg.error))
            } else if (msg.type === 'DOWNLOAD_ABORTED') {
                pendingDownloads.delete(msg.id)
                handlers.reject(new DOMException('Download cancelled', 'AbortError'))
            }
        })
    }
    return worker
}

let nextId = 0

/**
 * Save a tile via the worker's fast FileSystemSyncAccessHandle path. Never rejects - a
 * failed write (unsupported browser, OPFS error) is swallowed, same "best effort" contract as
 * the rest of the tile cache.
 */
export function saveTileViaWorker(layer: string, path: string, data: Uint8Array): Promise<void> {
    const id = `${Date.now()}-${nextId++}`
    const w = getWorker()

    const { promise, resolve } = Promise.withResolvers<void>()
    pendingSaves.set(id, resolve)

    // Structured-clone (copy) `data` rather than transferring it: a bundle download's tiles are
    // often subarray views over one shared backing buffer (see tilebundle/index.ts's
    // parseTileStream), so transferring one tile's view would detach the whole buffer out from
    // under any sibling tile views still pending a write.
    const request: SaveTileRequest = { type: 'SAVE_TILE', id, layer, path, data }
    w.postMessage(request)

    return promise
}

/**
 * Fetch and extract a pre-built tile bundle entirely inside the worker - the network read, the
 * bundle-stream parse, and every tile write all happen off the main thread, with only throttled
 * progress/checkpoint messages coming back. Rejects with a DOMException('...', 'AbortError') if
 * `signal` is aborted, matching the old main-thread downloadBundle's contract.
 */
export function downloadBundleViaWorker(
    url: string,
    layerId: string,
    tileExt: string,
    onProgress: (progress: number, bytesDownloaded: number) => void,
    signal: AbortSignal | undefined,
    resumeOffset: number,
    onCheckpoint?: (offset: number) => void,
): Promise<number> {
    const id = `${Date.now()}-${nextId++}`
    const w = getWorker()

    const { promise, resolve, reject } = Promise.withResolvers<number>()
    pendingDownloads.set(id, { onProgress, onCheckpoint, resolve, reject })

    if (signal) {
        if (signal.aborted) {
            pendingDownloads.delete(id)
            reject(new DOMException('Download cancelled', 'AbortError'))
            return promise
        }
        signal.addEventListener('abort', () => {
            const cancel: CancelDownloadRequest = { type: 'CANCEL_DOWNLOAD', id }
            w.postMessage(cancel)
        }, { once: true })
    }

    const request: DownloadBundleRequest = { type: 'DOWNLOAD_BUNDLE', id, url, layerId, tileExt, resumeOffset }
    w.postMessage(request)

    return promise
}
