// Pure geometry helpers for vectorClipWorker.ts: clip a decoded MVT feature's geometry
// (in tile-local extent-space, e.g. 0..4096) to an axis-aligned box and rescale it into a
// new tile's coordinate space. Used to synthesize a missing vector tile from a quadrant of
// its parent, the vector equivalent of rasterFallback.ts's crop-and-upscale.

import Point from '@mapbox/point-geometry'

// Structural subset of Point used internally, so intermediate (non-output) points don't need
// to be constructed via `new Point(...)`.
export interface TilePoint {
    x: number
    y: number
}

// MVT geometry types, per the vector tile spec (also VectorTileFeature.types).
export const enum GeomType {
    Point = 1,
    LineString = 2,
    Polygon = 3,
}

interface Box {
    xMin: number
    xMax: number
    yMin: number
    yMax: number
}

/** Liang-Barsky segment-vs-box clip. Returns the portion of a->b inside the box, or null. */
function clipSegment(a: TilePoint, b: TilePoint, box: Box): [TilePoint, TilePoint] | null {
    let t0 = 0
    let t1 = 1
    const dx = b.x - a.x
    const dy = b.y - a.y

    const clipT = (p: number, q: number): boolean => {
        if (p === 0) return q >= 0
        const r = q / p
        if (p < 0) {
            if (r > t1) return false
            if (r > t0) t0 = r
        } else {
            if (r < t0) return false
            if (r < t1) t1 = r
        }
        return true
    }

    if (!clipT(-dx, a.x - box.xMin)) return null
    if (!clipT(dx, box.xMax - a.x)) return null
    if (!clipT(-dy, a.y - box.yMin)) return null
    if (!clipT(dy, box.yMax - a.y)) return null

    return [
        { x: a.x + t0 * dx, y: a.y + t0 * dy },
        { x: a.x + t1 * dx, y: a.y + t1 * dy },
    ]
}

/** Clips an open polyline against a box, possibly splitting it into several pieces. */
function clipLine(line: TilePoint[], box: Box): TilePoint[][] {
    const result: TilePoint[][] = []
    let current: TilePoint[] = []

    for (let i = 0; i < line.length - 1; i++) {
        const clipped = clipSegment(line[i], line[i + 1], box)
        if (!clipped) {
            if (current.length > 1) result.push(current)
            current = []
            continue
        }

        const [start, end] = clipped
        const last = current[current.length - 1]
        if (last && last.x === start.x && last.y === start.y) {
            current.push(end)
        } else {
            if (current.length > 1) result.push(current)
            current = [start, end]
        }
    }

    if (current.length > 1) result.push(current)
    return result
}

/** One Sutherland-Hodgman pass, clipping a (possibly already-clipped) ring against one edge. */
function clipPolygonEdge(points: TilePoint[], inside: (p: TilePoint) => boolean, intersect: (a: TilePoint, b: TilePoint) => TilePoint): TilePoint[] {
    if (points.length === 0) return []
    const output: TilePoint[] = []
    let prev = points[points.length - 1]
    let prevInside = inside(prev)
    for (const curr of points) {
        const currInside = inside(curr)
        if (currInside) {
            if (!prevInside) output.push(intersect(prev, curr))
            output.push(curr)
        } else if (prevInside) {
            output.push(intersect(prev, curr))
        }
        prev = curr
        prevInside = currInside
    }
    return output
}

function lerpX(a: TilePoint, b: TilePoint, x: number): TilePoint {
    const t = (x - a.x) / (b.x - a.x)
    return { x, y: a.y + t * (b.y - a.y) }
}

function lerpY(a: TilePoint, b: TilePoint, y: number): TilePoint {
    const t = (y - a.y) / (b.y - a.y)
    return { x: a.x + t * (b.x - a.x), y }
}

/** Clips a closed polygon ring (first point === last point) against a box. */
function clipPolygon(ring: TilePoint[], box: Box): TilePoint[] {
    let points = ring
    points = clipPolygonEdge(points, p => p.x >= box.xMin, (a, b) => lerpX(a, b, box.xMin))
    points = clipPolygonEdge(points, p => p.x <= box.xMax, (a, b) => lerpX(a, b, box.xMax))
    points = clipPolygonEdge(points, p => p.y >= box.yMin, (a, b) => lerpY(a, b, box.yMin))
    points = clipPolygonEdge(points, p => p.y <= box.yMax, (a, b) => lerpY(a, b, box.yMax))

    if (points.length < 3) return []
    const first = points[0]
    const last = points[points.length - 1]
    if (first.x !== last.x || first.y !== last.y) points.push(first)
    return points
}

/**
 * Clips a feature's geometry (as returned by VectorTileFeature.loadGeometry()) to a box, then
 * rescales the surviving points from [box.xMin, box.xMax] x [box.yMin, box.yMax] to
 * [0, extent] x [0, extent] so the result can stand in as a full tile. Coordinates are rounded
 * to integers, since MVT geometry is delta-encoded as integers.
 */
export function clipAndRescale(geometry: TilePoint[][], type: GeomType, box: Box, extent: number): Point[][] {
    const scaleX = extent / (box.xMax - box.xMin)
    const scaleY = extent / (box.yMax - box.yMin)
    const rescale = (p: TilePoint): Point => new Point(
        Math.round((p.x - box.xMin) * scaleX),
        Math.round((p.y - box.yMin) * scaleY),
    )

    if (type === GeomType.Point) {
        return geometry
            .filter(([p]) => p.x >= box.xMin && p.x <= box.xMax && p.y >= box.yMin && p.y <= box.yMax)
            .map(([p]) => [rescale(p)])
    }

    if (type === GeomType.LineString) {
        const lines: Point[][] = []
        for (const line of geometry) {
            for (const piece of clipLine(line, box)) lines.push(piece.map(rescale))
        }
        return lines
    }

    // Polygon
    const rings: Point[][] = []
    for (const ring of geometry) {
        const clipped = clipPolygon(ring, box)
        if (clipped.length >= 4) rings.push(clipped.map(rescale))
    }
    return rings
}
