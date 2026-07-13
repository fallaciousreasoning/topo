import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";

const GEOLOGICAL_FEATURES_URL = '/data/geologicalFeatures.json'

const GEOLOGICAL_FEATURES_MINZOOM = 9

// Only types with a matching LINZ Topo50 sprite icon get one - volcano/crater
// have no equivalent symbol in the sprite, so they stay text-only.
const ICON_POINT_TYPES: [string, ...string[]] = ['cave', 'cave_entrance']

let geologicalFeaturesPromise: Promise<GeoJSON.FeatureCollection> | null = null

const getGeologicalFeatures = (): Promise<GeoJSON.FeatureCollection> => {
    if (!geologicalFeaturesPromise) {
        geologicalFeaturesPromise = fetch(GEOLOGICAL_FEATURES_URL).then(r => r.json())
    }
    return geologicalFeaturesPromise
}

const textPaint = {
    'text-color': '#7a3d1c',
    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
    'text-halo-width': 1.2,
} as const

export default {
    id: 'geologicalFeatures',
    name: 'Volcano & Cave Names',
    description: 'Named volcanoes, craters and caves, from OpenStreetMap and the NZGB Gazetteer',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result: data } = usePromise(getGeologicalFeatures, [])

        if (!data) return null

        return <Source id='geologicalFeatures' spec={{
            type: 'geojson',
            data,
        }}>
            <Layer layer={{
                id: 'geological-features-label-point',
                type: 'symbol',
                source: 'geologicalFeatures',
                minzoom: GEOLOGICAL_FEATURES_MINZOOM,
                filter: ['!', ['in', ['get', 'type'], ['literal', ICON_POINT_TYPES]]],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        9, 11,
                        15, 15,
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.06,
                },
                paint: textPaint,
            }} />
            <Layer layer={{
                id: 'geological-features-label-point-icon',
                type: 'symbol',
                source: 'geologicalFeatures',
                minzoom: GEOLOGICAL_FEATURES_MINZOOM,
                filter: ['in', ['get', 'type'], ['literal', ICON_POINT_TYPES]],
                layout: {
                    'icon-image': 'cave_pnt',
                    'icon-size': 1.2,
                    'icon-anchor': 'bottom',
                    'text-field': ['get', 'name'],
                    'text-anchor': 'center',
                    'text-offset': [0, 0.6],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        9, 11,
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
