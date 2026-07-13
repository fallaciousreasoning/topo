// Shared by cachingProtocol.ts (main thread) and compositeWorker.ts (worker) so that a
// missing raster tile (cache miss + network failure) can fall back to a cropped, upscaled
// slice of an ancestor tile instead of leaving a hole in the map. See vectorFallback.ts for
// the equivalent (geometry clip + rescale, run in a worker) for vector tiles.

import { parentUrl, parseTileUrl } from './tileUrl'

export function isRasterUrl(url: string): boolean {
    return /\.(png|jpe?g|webp|avif)(?:\?|$)/i.test(url)
}

async function cropQuadrant(data: ArrayBuffer, right: boolean, bottom: boolean): Promise<ArrayBuffer> {
    const bitmap = await createImageBitmap(new Blob([data]))
    const { width, height } = bitmap
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(
        bitmap,
        right ? width / 2 : 0, bottom ? height / 2 : 0, width / 2, height / 2,
        0, 0, width, height,
    )
    bitmap.close()
    const blob = await canvas.convertToBlob()
    return blob.arrayBuffer()
}

/**
 * Loads a raster tile, falling back to a cropped slice of the tile one zoom level up (and so
 * on, up to z0) if `fetchExact` can't produce the tile directly. `fetchExact` is expected to
 * check the cache and then the network for the given url and return null if both fail.
 */
export async function loadRasterTileWithFallback(
    url: string,
    fetchExact: (url: string) => Promise<ArrayBuffer | null>,
): Promise<ArrayBuffer | null> {
    const direct = await fetchExact(url)
    // A 0-byte response (HTTP 204, no data at this exact tile) is truthy but not usable -
    // treat it the same as a failed fetch so we still try ancestors instead of rendering blank.
    if (direct && direct.byteLength > 0) return direct

    const coords = parseTileUrl(url)
    if (!coords || coords.z <= 0) return null

    const parentData = await loadRasterTileWithFallback(parentUrl(url, coords), fetchExact)
    if (!parentData) return null

    return cropQuadrant(parentData, (coords.x & 1) === 1, (coords.y & 1) === 1)
}
