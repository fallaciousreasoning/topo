import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";
import { sizeBasedVisibility } from "./labelSizing";
import { useLayerHandler } from "../hooks/useLayerClickHandler";
import { useRouteUpdater } from "../routing/router";
import { useMap } from "../map/Map";
import { ringCentroid } from "../utils/polygonCentroid";

const WATER_FEATURES_URL = '/data/waterFeatures.json'

// MapLibre's default Polygon label placement anchors at the "pole of
// inaccessibility" (the widest inscribed circle), not the true centroid - for
// a dogleg-shaped lake (Wakatipu, Wanaka, ...) that puts the label off in
// whichever lobe happens to be widest rather than in the middle of the lake.
// Lakes are simple enough shapes (unlike glaciers - see polygon_shape.py) that
// a plain area centroid reads better, so labels are placed on a derived point
// source instead of relying on the polygon geometry's automatic placement.
function lakeCentroids(data: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: data.features
            .filter((f): f is GeoJSON.Feature<GeoJSON.Polygon> =>
                f.geometry.type === 'Polygon' && f.properties?.type === 'lake')
            .map(f => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: ringCentroid(f.geometry.coordinates[0]) },
                properties: f.properties,
            })),
    }
}

const WATER_FEATURES_MINZOOM = 10

const POLYGON_SIZE_STOPS: [number, number][] = [
    [0.3, 13],
    [1, 11],
    [3, 10],
]

let waterFeaturesPromise: Promise<GeoJSON.FeatureCollection> | null = null

const getWaterFeatures = (): Promise<GeoJSON.FeatureCollection> => {
    if (!waterFeaturesPromise) {
        waterFeaturesPromise = fetch(WATER_FEATURES_URL).then(r => r.json())
    }
    return waterFeaturesPromise
}

const textPaint = {
    'text-color': '#1c5c8c',
    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
    'text-halo-width': 1.2,
} as const

// Only types with a matching LINZ Topo50 sprite icon get one.
const POINT_ICON_TYPES: [string, ...string[]] = ['waterfall', 'spring', 'hot_spring']
const POINT_ICON_EXPRESSION = ['match', ['get', 'type'],
    'waterfall', 'waterfall_pnt',
    'spring', 'spring_cold_pnt',
    'hot_spring', 'spring_hot_pnt',
    '',
] as const

export default {
    id: 'waterFeatures',
    name: 'Lake & Geothermal Names',
    description: 'Named lakes, wetlands, waterfalls and springs, from OpenStreetMap and the NZGB Gazetteer',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result: data } = usePromise(getWaterFeatures, [])
        const centroids = React.useMemo(() => data ? lakeCentroids(data) : null, [data])
        const updateRoute = useRouteUpdater()
        const { map } = useMap()

        useLayerHandler('click', 'water-features-fill-polygon', e => {
            const feature = e.features?.[0]
            const name = feature?.properties?.name
            if (!name) return
            updateRoute({
                page: `location/${e.lngLat.lat}/${e.lngLat.lng}/${encodeURIComponent(name)}`
            })
        })
        useLayerHandler('mouseenter', 'water-features-fill-polygon', () => {
            map.getCanvas().style.cursor = 'pointer'
        })
        useLayerHandler('mouseleave', 'water-features-fill-polygon', () => {
            map.getCanvas().style.cursor = ''
        })

        // Not every water feature has OSM polygon geometry backing it (some are
        // gazetteer-only, rendered as a plain point - e.g. a wetland with no
        // matching OSM way) - those need their own click handling since they
        // never hit the fill-polygon layer above.
        const handlePointClick = (e: any) => {
            const feature = e.features?.[0]
            const name = feature?.properties?.name
            if (!name || feature.geometry.type !== 'Point') return
            const [lng, lat] = feature.geometry.coordinates
            updateRoute({
                page: `location/${lat}/${lng}/${encodeURIComponent(name)}`
            })
        }
        useLayerHandler('click', 'water-features-label-point', handlePointClick)
        useLayerHandler('click', 'water-features-label-point-icon', handlePointClick)
        useLayerHandler('mouseenter', 'water-features-label-point', () => {
            map.getCanvas().style.cursor = 'pointer'
        })
        useLayerHandler('mouseleave', 'water-features-label-point', () => {
            map.getCanvas().style.cursor = ''
        })
        useLayerHandler('mouseenter', 'water-features-label-point-icon', () => {
            map.getCanvas().style.cursor = 'pointer'
        })
        useLayerHandler('mouseleave', 'water-features-label-point-icon', () => {
            map.getCanvas().style.cursor = ''
        })

        if (!data || !centroids) return null

        return <>
        <Source id='waterFeatures' spec={{
            type: 'geojson',
            data,
        }}>
            <Layer layer={{
                id: 'water-features-fill-polygon',
                type: 'fill',
                source: 'waterFeatures',
                minzoom: WATER_FEATURES_MINZOOM,
                // Kept for both types (so a lake stays clickable - see the
                // useLayerHandler below - and single-clicking one still
                // opens its location page), but lakes render invisible:
                // tinting every lake in NZ blue at this zoom was a lot of
                // ink for not much extra information, and a lake's shape is
                // already drawn (in red) via SelectedShapeHighlight once
                // you've actually navigated to it (see LocationSection.tsx/
                // setSelectedShape) - no need to also shade it in
                // permanently. Wetlands are rarer and their green tint reads
                // more like genuinely useful terrain info, so they keep theirs.
                filter: ['==', ['geometry-type'], 'Polygon'],
                paint: {
                    'fill-color': '#5c7a4a',
                    'fill-opacity': ['match', ['get', 'type'], 'wetland', 0.15, 0],
                }
            }} />
            {/* Wetlands get LINZ Topo50's own swamp/reed symbol, centred in the shape. */}
            <Layer layer={{
                id: 'water-features-label-polygon-wetland',
                type: 'symbol',
                source: 'waterFeatures',
                minzoom: WATER_FEATURES_MINZOOM,
                filter: ['all',
                    ['==', ['geometry-type'], 'Polygon'],
                    ['==', ['get', 'type'], 'wetland'],
                    sizeBasedVisibility('sizeKm', POLYGON_SIZE_STOPS),
                ],
                layout: {
                    'icon-image': 'swamp_pnt',
                    'icon-size': 1.2,
                    'icon-anchor': 'bottom',
                    'text-field': ['get', 'name'],
                    'text-anchor': 'center',
                    'text-offset': [0, 0.6],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        10, 12,
                        15, 19,
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.06,
                },
                paint: textPaint,
            }} />
            <Layer layer={{
                id: 'water-features-label-point',
                type: 'symbol',
                source: 'waterFeatures',
                minzoom: WATER_FEATURES_MINZOOM,
                filter: ['all',
                    ['==', ['geometry-type'], 'Point'],
                    ['!', ['in', ['get', 'type'], ['literal', POINT_ICON_TYPES]]],
                ],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        10, 11,
                        15, 15,
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.06,
                },
                paint: textPaint,
            }} />
            <Layer layer={{
                id: 'water-features-label-point-icon',
                type: 'symbol',
                source: 'waterFeatures',
                minzoom: WATER_FEATURES_MINZOOM,
                filter: ['all',
                    ['==', ['geometry-type'], 'Point'],
                    ['in', ['get', 'type'], ['literal', POINT_ICON_TYPES]],
                ],
                layout: {
                    'icon-image': POINT_ICON_EXPRESSION as any,
                    'icon-size': 1.2,
                    'icon-anchor': 'bottom',
                    'text-field': ['get', 'name'],
                    'text-anchor': 'center',
                    'text-offset': [0, 0.6],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        10, 11,
                        15, 15,
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.06,
                },
                paint: textPaint,
            }} />
        </Source>
        {/* Lake names, placed at each polygon's true area centroid rather than
            MapLibre's default polygon anchor - see lakeCentroids/ringCentroid above. */}
        <Source id='waterFeaturesLakeCentroids' spec={{
            type: 'geojson',
            data: centroids,
        }}>
            <Layer layer={{
                id: 'water-features-label-polygon',
                type: 'symbol',
                source: 'waterFeaturesLakeCentroids',
                minzoom: WATER_FEATURES_MINZOOM,
                filter: sizeBasedVisibility('sizeKm', POLYGON_SIZE_STOPS),
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        10, 12,
                        15, 19,
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.06,
                },
                paint: textPaint,
            }} />
        </Source>
        </>
    }
} as OverlayDefinition
