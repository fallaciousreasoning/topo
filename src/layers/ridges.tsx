import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";

const RIDGES_URL = '/data/ridges.json'

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
                minzoom: 9,
                filter: ['==', ['get', 'source'], 'osm'],
                layout: {
                    'symbol-placement': 'line',
                    'symbol-spacing': 450,
                    'symbol-sort-key': ['*', -1, ['get', 'lengthKm']],
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['get', 'lengthKm'],
                        1, 18,
                        10, 23,
                        50, 29,
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
