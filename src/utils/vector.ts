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
