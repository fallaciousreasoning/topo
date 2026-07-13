// Vector-tile counterpart to rasterFallback.ts: if `fetchExact` can't produce a tile
// directly, fall back to a clipped, rescaled quadrant of the tile one zoom level up (and so
// on, up to z0), so a cache miss + network failure doesn't leave a hole in the map. The
// decode/clip/re-encode work happens in vectorClipWorker.ts, off the main thread.
import { parentUrl, parseTileUrl } from './tileUrl'
import { clipVectorQuadrant } from './vectorClipProtocol'

export async function loadVectorTileWithFallback(
    url: string,
    fetchExact: (url: string) => Promise<ArrayBuffer | null>,
): Promise<ArrayBuffer | null> {
    const direct = await fetchExact(url)
    if (direct) return direct

    const coords = parseTileUrl(url)
    if (!coords || coords.z <= 0) return null

    const parentData = await loadVectorTileWithFallback(parentUrl(url, coords), fetchExact)
    if (!parentData) return null

    return clipVectorQuadrant(parentData, (coords.x & 1) === 1, (coords.y & 1) === 1)
}
