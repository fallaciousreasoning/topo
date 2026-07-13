import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";
import { sizeBasedVisibility } from "./labelSizing";

const LANDFORMS_URL = '/data/landforms.json'

// Most of this dataset is dense, small features (2500+ named bays alone) -
// held back until reasonably zoomed in so they don't overwhelm a wide view.
// Cliffs/plateaus have real geometry to size against; everything else (points)
// is gated by the layer's own minzoom only.
const LANDFORMS_MINZOOM = 11

const CLIFF_SIZE_STOPS: [number, number][] = [
    [0.3, 13],
    [1, 12],
    [3, 11],
]

let landformsPromise: Promise<GeoJSON.FeatureCollection> | null = null

const getLandforms = (): Promise<GeoJSON.FeatureCollection> => {
    if (!landformsPromise) {
        landformsPromise = fetch(LANDFORMS_URL).then(r => r.json())
    }
    return landformsPromise
}

const textPaint = {
    'text-color': '#5c4a1c',
    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
    'text-halo-width': 1.2,
} as const

export default {
    id: 'landforms',
    name: 'Landform Names',
    description: 'Named cliffs, bays, saddles, islands and other landforms, from OpenStreetMap and the NZGB Gazetteer',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result: data } = usePromise(getLandforms, [])

        if (!data) return null

        return <Source id='landforms' spec={{
            type: 'geojson',
            data,
        }}>
            <Layer layer={{
                id: 'landforms-fill-polygon',
                type: 'fill',
                source: 'landforms',
                minzoom: LANDFORMS_MINZOOM,
                filter: ['==', ['geometry-type'], 'Polygon'],
                paint: {
                    'fill-color': '#a08a4a',
                    'fill-opacity': 0.15,
                }
            }} />
            <Layer layer={{
                id: 'landforms-label-line',
                type: 'symbol',
                source: 'landforms',
                minzoom: LANDFORMS_MINZOOM,
                filter: ['all',
                    ['==', ['geometry-type'], 'LineString'],
                    sizeBasedVisibility('lengthKm', CLIFF_SIZE_STOPS),
                ],
                layout: {
                    'symbol-placement': 'line',
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['get', 'lengthKm'],
                        0.3, 12,
                        2, 16,
                        8, 21,
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.06,
                    'text-max-angle': 85,
                },
                paint: textPaint,
            }} />
            <Layer layer={{
                id: 'landforms-label-polygon',
                type: 'symbol',
                source: 'landforms',
                minzoom: LANDFORMS_MINZOOM,
                filter: ['==', ['geometry-type'], 'Polygon'],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        11, 12,
                        15, 18,
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.06,
                },
                paint: textPaint,
            }} />
            <Layer layer={{
                id: 'landforms-label-point',
                type: 'symbol',
                source: 'landforms',
                minzoom: LANDFORMS_MINZOOM,
                filter: ['==', ['geometry-type'], 'Point'],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        11, 11,
                        15, 14,
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.06,
                },
                paint: textPaint,
            }} />
        </Source>
    }
} as OverlayDefinition
