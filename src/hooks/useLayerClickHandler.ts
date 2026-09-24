import { useEffect } from "react"
import { useMap } from "../map/Map"
import { Map, MapGeoJSONFeature, MapLayerMouseEvent, MapMouseEvent } from "maplibre-gl"

type Handler = (e: MapLayerMouseEvent) => void

// Clicks aren't registered per layer with maplibre - if they were, every layer
// under the tap would fire and whichever handler ran last would win. Instead one
// map-level listener picks the smallest feature under the tap (points, then
// lines, then polygons, smallest first) and only calls that layer's handlers.
const clickRegistries = new WeakMap<Map, globalThis.Map<string, Set<Handler>>>()

const getClickRegistry = (map: Map) => {
    let registry = clickRegistries.get(map)
    if (registry) return registry

    const handlers = new globalThis.Map<string, Set<Handler>>()
    clickRegistries.set(map, handlers)

    map.on('click', (e: MapMouseEvent) => {
        const layers = [...handlers.keys()].filter(id => handlers.get(id)!.size && map.getLayer(id))
        if (!layers.length) return

        const features = map.queryRenderedFeatures(e.point, { layers })
        if (!features.length) return

        const best = features.reduce((a, b) => compareSize(b, a) < 0 ? b : a)
        const event = new MapMouseEvent('click', map, e.originalEvent, { features: [best] }) as MapLayerMouseEvent
        for (const handler of handlers.get(best.layer.id) ?? []) handler(event)
    })

    return handlers
}

const geometryRank = (feature: MapGeoJSONFeature) => {
    const type = feature.geometry.type
    if (type === 'Point' || type === 'MultiPoint') return 0
    if (type === 'LineString' || type === 'MultiLineString') return 1
    return 2
}

// Ring area in squared degrees (longitude scaled by latitude) - only used for
// comparing features against each other, so the units don't matter
const ringArea = (ring: GeoJSON.Position[]) => {
    const scale = Math.cos((ring[0]?.[1] ?? 0) * Math.PI / 180)
    let area = 0
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        area += (ring[j][0] - ring[i][0]) * scale * (ring[j][1] + ring[i][1])
    }
    return Math.abs(area / 2)
}

const lineLength = (line: GeoJSON.Position[]) => {
    const scale = Math.cos((line[0]?.[1] ?? 0) * Math.PI / 180)
    let length = 0
    for (let i = 1; i < line.length; i++) {
        length += Math.hypot((line[i][0] - line[i - 1][0]) * scale, line[i][1] - line[i - 1][1])
    }
    return length
}

// Note the geometry is clipped to the tile it was queried from, but that
// preserves containment (a lake inside a park is still smaller than the park)
const featureSize = (feature: MapGeoJSONFeature) => {
    const geometry = feature.geometry
    switch (geometry.type) {
        case 'LineString': return lineLength(geometry.coordinates)
        case 'MultiLineString': return geometry.coordinates.reduce((sum, l) => sum + lineLength(l), 0)
        case 'Polygon': return ringArea(geometry.coordinates[0] ?? [])
        case 'MultiPolygon': return geometry.coordinates.reduce((sum, p) => sum + ringArea(p[0] ?? []), 0)
        default: return 0
    }
}

const compareSize = (a: MapGeoJSONFeature, b: MapGeoJSONFeature) =>
    geometryRank(a) - geometryRank(b) || featureSize(a) - featureSize(b)

export const useLayerHandler = (event: string, layer: string, handler: Handler) => {
    const { map } = useMap()

    useEffect(() => {
        if (event === 'click') {
            const registry = getClickRegistry(map)
            if (!registry.has(layer)) registry.set(layer, new Set())
            registry.get(layer)!.add(handler)
            return () => {
                registry.get(layer)?.delete(handler)
            }
        }

        map.on(event as any, layer, handler);
        return () => {
            map.off(event as any, layer, handler)
        }
    }, [event, layer, handler])
}
