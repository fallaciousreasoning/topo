import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";
import { sizeBasedVisibility } from "./labelSizing";

const WATERWAYS_URL = '/data/waterways.json'

// Short minor streams only reveal themselves once zoomed in past 12; long major
// rivers show from a wide view. Continuous by length rather than the river/stream
// category, so an unusually long "stream"-tagged waterway still shows early, and
// a short "river"-tagged one doesn't. See labelSizing.ts.
const WATERWAY_SIZE_STOPS: [number, number][] = [
    [0.2, 12],
    [3, 11],
    [8, 10],
    [25, 9],
    [100, 7],
]

let waterwaysPromise: Promise<GeoJSON.FeatureCollection> | null = null

const getWaterways = (): Promise<GeoJSON.FeatureCollection> => {
    if (!waterwaysPromise) {
        waterwaysPromise = fetch(WATERWAYS_URL).then(r => r.json())
    }
    return waterwaysPromise
}

export default {
    id: 'waterways',
    name: 'River & Stream Names',
    description: 'Named rivers and streams, from OpenStreetMap. Minor streams only appear when zoomed in close.',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result: data } = usePromise(getWaterways, [])

        if (!data) return null

        return <Source id='waterways' spec={{
            type: 'geojson',
            data,
        }}>
            <Layer layer={{
                id: 'waterways-label',
                type: 'symbol',
                source: 'waterways',
                minzoom: 7,
                filter: sizeBasedVisibility('lengthKm', WATERWAY_SIZE_STOPS),
                layout: {
                    'symbol-placement': 'line',
                    'symbol-spacing': 400,
                    'symbol-sort-key': ['*', -1, ['get', 'lengthKm']],
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        9, ['interpolate', ['linear'], ['get', 'lengthKm'], 0.2, 8, 1, 10, 10, 14, 50, 18],
                        11, ['interpolate', ['linear'], ['get', 'lengthKm'], 0.2, 10, 1, 12, 10, 17, 50, 21],
                        14, ['interpolate', ['linear'], ['get', 'lengthKm'], 0.2, 12, 1, 15, 10, 21, 50, 27],
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.06,
                    'text-max-angle': 85,
                },
                paint: {
                    'text-color': '#1c5c8c',
                    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
                    'text-halo-width': 1.2,
                }
            }} />
        </Source>
    }
} as OverlayDefinition
