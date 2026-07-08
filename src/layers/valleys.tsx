import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";
import { sizeBasedVisibility } from "./labelSizing";

const VALLEYS_URL = '/data/valleys.json'

// Valleys/gullies are hidden below zoom 12 entirely - even the biggest basins
// are a pretty minor feature to be showing on a wide-area view. Above that,
// short ones still only reveal themselves once zoomed in closer than long
// ones. See labelSizing.ts. Point valleys (most of them - a single OSM node)
// have no size property, so this only affects the line layer.
const VALLEY_SIZE_STOPS: [number, number][] = [
    [0.2, 13],
    [1, 12],
    [3, 12],
]

let valleysPromise: Promise<GeoJSON.FeatureCollection> | null = null

const getValleys = (): Promise<GeoJSON.FeatureCollection> => {
    if (!valleysPromise) {
        valleysPromise = fetch(VALLEYS_URL).then(r => r.json())
    }
    return valleysPromise
}

export default {
    id: 'valleys',
    name: 'Valley Names',
    description: 'Named valleys and basins, from OpenStreetMap',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result: data } = usePromise(getValleys, [])

        if (!data) return null

        return <Source id='valleys' spec={{
            type: 'geojson',
            data,
        }}>
            {/* Most valleys are mapped as a single OSM node - only a minority trace
                the valley floor as a line, so split by geometry rather than source. */}
            <Layer layer={{
                id: 'valleys-label-line',
                type: 'symbol',
                source: 'valleys',
                minzoom: 12,
                filter: ['all',
                    ['==', ['geometry-type'], 'LineString'],
                    sizeBasedVisibility('lengthKm', VALLEY_SIZE_STOPS),
                ],
                layout: {
                    'symbol-placement': 'line',
                    'symbol-spacing': 450,
                    'symbol-sort-key': ['*', -1, ['get', 'lengthKm']],
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['get', 'lengthKm'],
                        1, 16,
                        10, 21,
                        50, 27,
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
            <Layer layer={{
                id: 'valleys-label-point',
                type: 'symbol',
                source: 'valleys',
                minzoom: 12,
                filter: ['==', ['geometry-type'], 'Point'],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': 15,
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
