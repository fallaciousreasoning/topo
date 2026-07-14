import { parseTileStream, HEADER_SIZE } from './index'
import opfsCache from '../caches/opfs'

const BUNDLE_BASE_URL = 'https://pub-36de1a8a322545b9bd6ef274d5f46c7c.r2.dev'

/**
 * `maxZoom` selects the bundle variant: 16 (or unspecified) gets the full-detail HD bundle,
 * 15 or below gets the smaller SD bundle (suffixed `-15`).
 */
export function getBundleUrl(layerId: string, regionCode: string, maxZoom?: number): string {
    if (layerId === 'dem') return `${BUNDLE_BASE_URL}/elevation-tiles-12.tilebundle`
    if (layerId === 'topoVector') return `${BUNDLE_BASE_URL}/topographic-v2.tilebundle`
    const suffix = maxZoom != null && maxZoom <= 15 ? '-15' : ''
    const prefix = layerId === 'topo-raster' ? 'topo' : layerId
    return `${BUNDLE_BASE_URL}/${prefix}-${regionCode.toLowerCase()}${suffix}.tilebundle`
}

/** File extension tiles are stored under in a given layer's bundle (and thus in the OPFS cache). */
export function getBundleTileExt(layerId: string): string {
    return layerId === 'topoVector' ? 'pbf' : 'png'
}

/** Actual file sizes (bytes) of the topo-raster island bundles, for showing accurate download estimates. */
export const ISLAND_BUNDLE_SIZES: Record<string, { hd: number, sd: number }> = {
    'north-island': { hd: 7_392_293_788, sd: 2_952_034_428 },
    'south-island': { hd: 10_577_906_577, sd: 4_206_589_166 },
    'stewart-island': { hd: 54_057_847, sd: 23_291_700 },
}

/** How many tiles to write between persisting a resumable checkpoint. */
const CHECKPOINT_TILE_INTERVAL = 100

/** How many OPFS writes to have in flight at once, so disk I/O doesn't stall the network read. */
const WRITE_CONCURRENCY = 8

/**
 * Fetch a pre-built tile bundle from `url` and extract each tile into OPFS under
 * `layerId` as its bytes arrive — tiles are written while the file is still
 * downloading, so peak memory usage stays bounded to a single tile rather than
 * the whole bundle. Tiles are stored with the given `tileExt` (e.g. 'png').
 *
 * `onProgress` receives a progress value in [0, 1] (tracking bytes received against the
 * bundle's total size) alongside the running byte count itself.
 *
 * Pass `signal` to allow cancelling mid-download; a cancelled download throws an `AbortError`.
 *
 * Pass `resumeOffset` (a byte offset previously reported via `onCheckpoint`) to resume a
 * partial download via an HTTP Range request instead of starting over from byte 0. R2 (and
 * most CDNs) honour this, but if the response comes back as a plain `200` instead of `206`,
 * the whole file is being sent again and we transparently fall back to a fresh download.
 * `onCheckpoint` is called periodically with the current byte offset — call sites should
 * persist it so a later resume attempt can pass it back in as `resumeOffset`.
 *
 * Returns the total number of tiles written in this call (not counting any written in a
 * previous, resumed-from attempt).
 */
export async function downloadBundle(
    url: string,
    layerId: string,
    tileExt: string,
    onProgress: (progress: number, bytesDownloaded: number) => void,
    signal?: AbortSignal,
    resumeOffset: number = 0,
    onCheckpoint?: (offset: number) => void,
): Promise<number> {
    const response = await fetch(url, {
        signal,
        headers: resumeOffset > 0 ? { Range: `bytes=${resumeOffset}-` } : undefined,
    })
    if (!response.ok && response.status !== 206) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    let bytesReceived: number
    let totalBytes: number

    if (response.status === 206) {
        // Range honoured. We'd ideally read the true total from Content-Range's "start-end/total",
        // but that header isn't in the CORS-safelisted set and R2 doesn't send
        // Access-Control-Expose-Headers, so cross-origin JS can't actually read it — it silently
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

    // Writes are fired off without waiting for each one individually (bounded to
    // WRITE_CONCURRENCY at a time), so OPFS write latency doesn't stall the network read —
    // otherwise the reader falling behind can throttle how fast the browser drains the
    // connection. `saveTile` never rejects (it swallows write failures internally), so there's
    // no unhandled-rejection risk in not awaiting these individually.
    const inFlight = new Set<Promise<void>>()

    // Checkpoints are based on confirmed (completed) writes rather than tiles merely parsed off
    // the network, so a resume never assumes a tile is on disk before it actually is. Because
    // writes can complete slightly out of order under concurrency, a checkpoint can very rarely
    // be up to WRITE_CONCURRENCY tiles ahead of a genuinely contiguous prefix — an acceptable,
    // bounded trade-off consistent with the best-effort tile caching elsewhere in this file.
    let confirmedBytes = bytesReceived
    let confirmedSinceCheckpoint = 0

    for await (const { z, x, y, data } of parseTileStream(reader)) {
        if (signal?.aborted) throw new DOMException('Download cancelled', 'AbortError')

        const recordBytes = HEADER_SIZE + data.length
        let tracked: Promise<void>
        tracked = opfsCache.saveTile(layerId, `/${z}/${x}/${y}.${tileExt}`, data).then(() => {
            inFlight.delete(tracked)
            confirmedBytes += recordBytes
            if (++confirmedSinceCheckpoint >= CHECKPOINT_TILE_INTERVAL) {
                confirmedSinceCheckpoint = 0
                onCheckpoint?.(confirmedBytes)
            }
        })
        inFlight.add(tracked)

        tilesWritten++
        bytesReceived += recordBytes
        onProgress(totalBytes > 0 ? Math.min(1, bytesReceived / totalBytes) : 0, bytesReceived)

        if (inFlight.size >= WRITE_CONCURRENCY) {
            await Promise.race(inFlight)
        }
    }

    await Promise.all(inFlight)
    onProgress(1, bytesReceived)
    return tilesWritten
}
