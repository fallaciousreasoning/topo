import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";
import { sizeBasedVisibility } from "./labelSizing";

const WATER_FEATURES_URL = '/data/waterFeatures.json'

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

        if (!data) return null

        return <Source id='waterFeatures' spec={{
            type: 'geojson',
            data,
        }}>
            <Layer layer={{
                id: 'water-features-fill-polygon',
                type: 'fill',
                source: 'waterFeatures',
                minzoom: WATER_FEATURES_MINZOOM,
                filter: ['==', ['geometry-type'], 'Polygon'],
                paint: {
                    'fill-color': ['match', ['get', 'type'], 'wetland', '#5c7a4a', '#1c5c8c'],
                    'fill-opacity': 0.15,
                }
            }} />
            <Layer layer={{
                id: 'water-features-label-polygon',
                type: 'symbol',
                source: 'waterFeatures',
                minzoom: WATER_FEATURES_MINZOOM,
                filter: ['all',
                    ['==', ['geometry-type'], 'Polygon'],
                    ['!=', ['get', 'type'], 'wetland'],
                    sizeBasedVisibility('sizeKm', POLYGON_SIZE_STOPS),
                ],
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
    }
} as OverlayDefinition
