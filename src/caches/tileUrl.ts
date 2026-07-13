// Shared by rasterFallback.ts and vectorFallback.ts: parses the numeric z/x/y/ext out of a
// substituted tile URL (i.e. after MapLibre has replaced the {z}/{x}/{y} template) and
// computes the URL of the tile one zoom level up, so fallback logic can walk up the pyramid.

const TILE_PATH = /\/(\d+)\/(\d+)\/(\d+)(\.[a-zA-Z0-9]+)/

export interface TileCoords {
    z: number
    x: number
    y: number
    ext: string
    index: number
    matchLength: number
}

export function parseTileUrl(url: string): TileCoords | null {
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

export function parentUrl(url: string, coords: TileCoords): string {
    const replacement = `/${coords.z - 1}/${coords.x >> 1}/${coords.y >> 1}${coords.ext}`
    return url.slice(0, coords.index) + replacement + url.slice(coords.index + coords.matchLength)
}
