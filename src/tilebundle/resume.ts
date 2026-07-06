import db, { Download } from '../caches/indexeddb'
import { cacherPromise } from '../caches/cachingProtocol'
import { NZ_REGIONS } from './regions'
import { getBundleUrl, downloadBundle } from './download'
import { downloadViewportTiles, polygonBbox, bboxesOverlap } from './viewport'

const PROGRESS_WRITE_INTERVAL_MS = 200

const activeDownloads = new Map<number, AbortController>()

/**
 * Cancel a download, however it's currently running. If a runner is actively fetching it, this
 * aborts it — `runDownload`'s catch block then removes the record and any tiles it wrote. If the
 * record is just sitting at 'downloading' with no active runner (e.g. orphaned by a crash before
 * the auto-resumer picked it back up), there's nothing to abort, so it's removed directly instead —
 * otherwise cancelling such a download would silently do nothing.
 */
export async function cancelDownload(download: Download): Promise<void> {
    const controller = download.id != null ? activeDownloads.get(download.id) : undefined
    if (controller) {
        controller.abort()
    } else {
        await removeDownload(download)
    }
}

/**
 * Delete a download's record and, unless another download for the same layer covers overlapping
 * ground, the tiles it wrote too — so cancelling or removing one download never destroys tiles
 * that another download still relies on.
 *
 * The record is deleted first so the Downloads list (reactive on the DB) updates immediately —
 * the tile cleanup that follows can be a slow full-layer scan for a large download, and there's
 * no reason to make the user wait on it just to see the row disappear.
 */
export async function removeDownload(download: Download): Promise<void> {
    await db.deleteDownload(download)

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
}

/**
 * Run (or resume) a download to completion, updating its DB record as it progresses.
 *
 * Per-tile viewport downloads skip tiles already present in the cache, so an interrupted
 * download (e.g. by a page reload) picks back up close to where it left off rather than
 * re-fetching everything. Region bundle downloads resume via an HTTP Range request from the
 * last checkpointed byte offset (`download.resumeOffset`), so an interrupted multi-gigabyte
 * download doesn't have to restart from byte 0.
 *
 * If cancelled via `cancelDownload`, any tiles already written for it are deleted and the
 * download record itself is removed, rather than being left in an error state.
 */
export async function runDownload(download: Download, onProgress?: (progress: number) => void): Promise<void> {
    if (download.id == null) throw new Error('Cannot run a download without an id')

    const controller = new AbortController()
    activeDownloads.set(download.id, controller)

    // All incremental DB writes below build on this, rather than the original `download` snapshot,
    // so they don't stomp on each other's fields (e.g. a progress write undoing a checkpoint write).
    let current: Download = { ...download, status: 'downloading', error: undefined }
    await db.updateDownload(current)

    let lastWriteTime = 0
    const throttledProgress = (p: number) => {
        onProgress?.(p)
        const now = Date.now()
        if (now - lastWriteTime > PROGRESS_WRITE_INTERVAL_MS) {
            lastWriteTime = now
            current = { ...current, progress: p }
            db.updateDownload(current)
        }
    }
    const persistCheckpoint = (offset: number) => {
        current = { ...current, resumeOffset: offset }
        db.updateDownload(current)
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
                download.resumeOffset ?? 0,
                persistCheckpoint,
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
        current = { ...current, status: 'complete', progress: 1, tilesDownloaded: tilesWritten, resumeOffset: 0 }
        await db.updateDownload(current)
    } catch (err) {
        if (controller.signal.aborted) {
            await removeDownload(download)
        } else {
            current = { ...current, status: 'error', error: String(err) }
            await db.updateDownload(current)
        }
    } finally {
        activeDownloads.delete(download.id)
    }
}
