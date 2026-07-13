// Shared by cachingProtocol.ts (main thread) and compositeWorker.ts (worker) so that a
// missing raster tile (cache miss + network failure) can fall back to a cropped, upscaled
// slice of an ancestor tile instead of leaving a hole in the map. Not used for vector tiles:
// there's no sensible way to "zoom in" on a slice of vector geometry.

const TILE_PATH = /\/(\d+)\/(\d+)\/(\d+)(\.[a-zA-Z0-9]+)/

export function isRasterUrl(url: string): boolean {
    return /\.(png|jpe?g|webp|avif)(?:\?|$)/i.test(url)
}

interface TileCoords {
    z: number
    x: number
    y: number
    ext: string
    index: number
    matchLength: number
}

function parseTileUrl(url: string): TileCoords | null {
    const match = url.match(TILE_PATH)
    if (!match || match.index === undefined) return null
    return {
        z: parseInt(match[1], 10),
        x: parseInt(match[2], 10),
        y: parseInt(match[3], 10),
        ext: match[4],
        index: match.index,
        matchLength: match[0].length,
    }
}

function parentUrl(url: string, coords: TileCoords): string {
    const replacement = `/${coords.z - 1}/${coords.x >> 1}/${coords.y >> 1}${coords.ext}`
    return url.slice(0, coords.index) + replacement + url.slice(coords.index + coords.matchLength)
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
    if (direct) return direct

    const coords = parseTileUrl(url)
    if (!coords || coords.z <= 0) return null

    const parentData = await loadRasterTileWithFallback(parentUrl(url, coords), fetchExact)
    if (!parentData) return null

    return cropQuadrant(parentData, (coords.x & 1) === 1, (coords.y & 1) === 1)
}
