import db, { Download } from '../caches/indexeddb'
import { NZ_REGIONS } from './regions'
import { getBundleUrl, downloadBundle } from './download'
import { downloadViewportTiles, polygonBbox } from './viewport'

const PROGRESS_WRITE_INTERVAL_MS = 200

/**
 * Run (or resume) a download to completion, updating its DB record as it progresses.
 *
 * Per-tile viewport downloads skip tiles already present in the cache, so an interrupted
 * download (e.g. by a page reload) picks back up close to where it left off rather than
 * re-fetching everything. Region bundle downloads aren't fetched tile-by-tile, so resuming
 * one re-fetches the whole bundle — slower, but it won't leave the record stuck forever.
 */
export async function runDownload(download: Download, onProgress?: (progress: number) => void): Promise<void> {
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
                getBundleUrl(download.layerId, region.code),
                download.layerId,
                'png',
                throttledProgress,
            )
        } else {
            tilesWritten = await downloadViewportTiles(
                download.layerId,
                polygonBbox(download.polygon),
                download.minZoom,
                download.maxZoom,
                throttledProgress,
            )
        }
        await db.updateDownload({ ...download, status: 'complete', progress: 1, tilesDownloaded: tilesWritten })
    } catch (err) {
        await db.updateDownload({ ...download, status: 'error', error: String(err) })
    }
}
