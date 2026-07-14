/** Parsed from a `/z/x/y.ext` (optionally with a domain/query prefix or suffix) tile id/URL. */
export interface TileCoords {
    z: string
    x: string
    y: string
    ext: string
}

/**
 * Extracts z/x/y/ext from a tile id or URL. Only the trailing `/z/x/y.ext` matters, so this
 * matches regardless of whatever domain, path prefix, or query string surrounds it - a bundle
 * download's clean `/z/x/y.ext` key and a live fetch's full
 * `basemaps.linz.govt.nz/.../z/x/y.ext?api=...` URL both resolve to the same OPFS location.
 */
export function parseTileCoords(id: string): TileCoords | null {
    const match = id.match(/\/(\d+)\/(\d+)\/(\d+)\.([a-z]+)(?:\?|$)/)
    if (!match) return null
    return { z: match[1], x: match[2], y: match[3], ext: match[4] }
}
