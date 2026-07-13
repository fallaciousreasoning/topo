// True area centroid of a lon/lat ring (shoelace-based), as opposed to
// MapLibre's default polygon label anchor which uses the "pole of
// inaccessibility" (widest inscribed circle) - for a dogleg-shaped feature
// that puts the anchor off in whichever lobe happens to be widest rather than
// the middle of the shape. Used for lake label placement (see
// waterFeatures.tsx).
export function ringCentroid(ring: GeoJSON.Position[]): GeoJSON.Position {
    let area = 0, cx = 0, cy = 0
    for (let i = 0; i < ring.length - 1; i++) {
        const [x0, y0] = ring[i]
        const [x1, y1] = ring[i + 1]
        const cross = x0 * y1 - x1 * y0
        area += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    }
    area /= 2
    if (Math.abs(area) < 1e-12) {
        // Degenerate (zero-area) ring - fall back to a plain vertex average.
        const n = ring.length - 1
        return [ring.slice(0, n).reduce((s, p) => s + p[0], 0) / n, ring.slice(0, n).reduce((s, p) => s + p[1], 0) / n]
    }
    return [cx / (6 * area), cy / (6 * area)]
}
