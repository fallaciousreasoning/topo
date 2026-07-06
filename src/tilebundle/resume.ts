import db, { Download } from '../caches/indexeddb'
import { cacherPromise } from '../caches/cachingProtocol'
import { NZ_REGIONS } from './regions'
import { getBundleUrl, downloadBundle } from './download'
import { downloadViewportTiles, polygonBbox, bboxesOverlap } from './viewport'

const PROGRESS_WRITE_INTERVAL_MS = 200

const activeDownloads = new Map<number, AbortController>()

/** Cancel an in-progress download. Any tiles it already wrote are removed, and its record is deleted. */
export function cancelDownload(downloadId: number) {
    activeDownloads.get(downloadId)?.abort()
}

/**
 * Delete a download's record and, unless another download for the same layer covers overlapping
 * ground, the tiles it wrote too — so cancelling or removing one download never destroys tiles
 * that another download still relies on.
 */
export async function removeDownload(download: Download): Promise<void> {
    const bbox = polygonBbox(download.polygon)
    const others = await db.getDownloads()
    const overlapsAnother = others.some(d =>
        d.id !== download.id &&
        d.layerId === download.layerId &&
        bboxesOverlap(polygonBbox(d.polygon), bbox)
    )

    if (!overlapsAnother) {
        const [west, south, east, north] = bbox
        const cacher = await cacherPromise.then(r => r.default)
        await cacher.deleteTilesInBbox(download.layerId, west, south, east, north)
    }

    await db.deleteDownload(download)
}

/**
 * Run (or resume) a download to completion, updating its DB record as it progresses.
 *
 * Per-tile viewport downloads skip tiles already present in the cache, so an interrupted
 * download (e.g. by a page reload) picks back up close to where it left off rather than
 * re-fetching everything. Region bundle downloads aren't fetched tile-by-tile, so resuming
 * one re-fetches the whole bundle — slower, but it won't leave the record stuck forever.
 *
 * If cancelled via `cancelDownload`, any tiles already written for it are deleted and the
 * download record itself is removed, rather than being left in an error state.
 */
export async function runDownload(download: Download, onProgress?: (progress: number) => void): Promise<void> {
    if (download.id == null) throw new Error('Cannot run a download without an id')

    const controller = new AbortController()
    activeDownloads.set(download.id, controller)

    await db.updateDownload({ ...download, status: 'downloading', error: undefined })

    let lastWriteTime = 0
    const throttledProgress = (p: number) => {
        onProgress?.(p)
        const now = Date.now()
        if (now - lastWriteTime > PROGRESS_WRITE_INTERVAL_MS) {
            lastWriteTime = now
            db.updateDownload({ ...download, status: 'downloading', progress: p })
        }
    }

    try {
        let tilesWritten: number
        if (download.regionId !== null) {
            const region = NZ_REGIONS.find(r => r.id === download.regionId)
            if (!region) throw new Error(`Unknown region: ${download.regionId}`)
            tilesWritten = await downloadBundle(
                getBundleUrl(download.layerId, region.code, download.maxZoom),
                download.layerId,
                'png',
                throttledProgress,
                controller.signal,
            )
        } else {
            tilesWritten = await downloadViewportTiles(
                download.layerId,
                polygonBbox(download.polygon),
                download.minZoom,
                download.maxZoom,
                throttledProgress,
                controller.signal,
            )
        }
        await db.updateDownload({ ...download, status: 'complete', progress: 1, tilesDownloaded: tilesWritten })
    } catch (err) {
        if (controller.signal.aborted) {
            await removeDownload(download)
        } else {
            await db.updateDownload({ ...download, status: 'error', error: String(err) })
        }
    } finally {
        activeDownloads.delete(download.id)
    }
}
