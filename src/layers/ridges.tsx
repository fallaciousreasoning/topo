import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";
import { sizeBasedVisibility } from "./labelSizing";

const RIDGES_URL = '/data/ridges.json'

// Small spurs only reveal themselves once zoomed in close. Everything hides
// below zoom 10 except the Southern Alps itself (168km after simplification,
// by far the longest named ridge in the dataset - next longest is 97.7km) -
// the plateau at 15-130km keeps every other range hidden until zoom 10, then
// the steep drop to 150km singles out just the Alps for the wide, zoomed-out view.
const RIDGE_SIZE_STOPS: [number, number][] = [
    [0.5, 13],
    [2, 12],
    [5, 11],
    [15, 10],
    [130, 10],
    [150, 6],
]

let ridgesPromise: Promise<GeoJSON.FeatureCollection> | null = null

const getRidges = (): Promise<GeoJSON.FeatureCollection> => {
    if (!ridgesPromise) {
        ridgesPromise = fetch(RIDGES_URL).then(r => r.json())
    }
    return ridgesPromise
}

export default {
    id: 'ridges',
    name: 'Ridge & Range Names',
    description: 'Named ridges and mountain ranges, from OpenStreetMap',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result: data } = usePromise(getRidges, [])

        if (!data) return null

        return <Source id='ridges' spec={{
            type: 'geojson',
            data,
        }}>
            <Layer layer={{
                id: 'ridges-label',
                type: 'symbol',
                source: 'ridges',
                minzoom: 6,
                filter: ['all',
                    ['==', ['get', 'source'], 'osm'],
                    sizeBasedVisibility('lengthKm', RIDGE_SIZE_STOPS),
                ],
                layout: {
                    'symbol-placement': 'line',
                    'symbol-spacing': 450,
                    'symbol-sort-key': ['*', -1, ['get', 'lengthKm']],
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        9, ['interpolate', ['linear'], ['get', 'lengthKm'], 1, 12, 10, 15, 50, 19],
                        11, ['interpolate', ['linear'], ['get', 'lengthKm'], 1, 14, 10, 18, 50, 23],
                        14, ['interpolate', ['linear'], ['get', 'lengthKm'], 1, 18, 10, 23, 50, 29],
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.08,
                    'text-max-angle': 85,
                },
                paint: {
                    'text-color': '#3a3a2e',
                    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
                    'text-halo-width': 1.2,
                }
            }} />
            {/* Gazetteer ranges with no matching OSM line - shown as a plain point label */}
            <Layer layer={{
                id: 'ridges-label-point',
                type: 'symbol',
                source: 'ridges',
                minzoom: 9,
                filter: ['==', ['get', 'source'], 'gazetteer'],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': 19,
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.08,
                },
                paint: {
                    'text-color': '#3a3a2e',
                    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
                    'text-halo-width': 1.2,
                }
            }} />
        </Source>
    }
} as OverlayDefinition
