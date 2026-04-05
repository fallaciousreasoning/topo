type Vec = [number, number]

export const add = (one: Vec, two: Vec): Vec => [one[0] + two[0], one[1] + two[1]]
export const len = (v: Vec) => Math.sqrt(v[0] ** 2 + v[1] ** 2)
export const div = (v: Vec, n: number): Vec => [v[0] / n, v[1] / n]
export const mul = (v: Vec, n: number | Vec): Vec => {
    const other: Vec = typeof n === "number" ? [n, n] : n
    return [v[0] * other[0], v[1] * other[1]]
}
export const sub = (one: Vec, two: Vec): Vec => [one[0] - two[0], one[1] - two[1]]
export const normal = (v: Vec): Vec => {
    const l = len(v)
    return [v[0] / l, v[1] / l]
}
export const dot = (one: Vec, two: Vec) => one[0] * two[0] + one[1] * two[1]

export const distance = (one: Vec, two: Vec) => len(sub(two, one)) 

export const getClosestPoint = (line1: Vec, line2: Vec, point: Vec) => {
    const line = sub(line2, line1)
    const normalizedDir = normal(line)
    const offsetPoint = sub(point, line1)
    const distance = dot(offsetPoint, normalizedDir)
    return add(line1,
        mul(normalizedDir, distance)
    )
}

/** Returns the closest point on a polyline to the given point (clamped to each segment). */
export function closestPointOnPolyline(point: Vec, coords: Vec[]): Vec {
    let bestDist = Infinity
    let best = coords[0]
    for (let i = 0; i < coords.length - 1; i++) {
        const ax = coords[i][0], ay = coords[i][1]
        const bx = coords[i + 1][0], by = coords[i + 1][1]
        const dx = bx - ax, dy = by - ay
        const lenSq = dx * dx + dy * dy
        const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((point[0] - ax) * dx + (point[1] - ay) * dy) / lenSq))
        const px = ax + t * dx, py = ay + t * dy
        const d = (px - point[0]) ** 2 + (py - point[1]) ** 2
        if (d < bestDist) { bestDist = d; best = [px, py] }
    }
    return best
}
