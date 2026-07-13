import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";
import { sizeBasedVisibility } from "./labelSizing";

const PROTECTED_AREAS_URL = '/data/protectedAreas.json'

// This dataset is dense (5000+ named reserves, parks and historic sites) - held
// back further than the other new overlays so it doesn't overwhelm the view.
const PROTECTED_AREAS_MINZOOM = 11

const POLYGON_SIZE_STOPS: [number, number][] = [
    [1, 13],
    [5, 12],
    [15, 11],
]

let protectedAreasPromise: Promise<GeoJSON.FeatureCollection> | null = null

const getProtectedAreas = (): Promise<GeoJSON.FeatureCollection> => {
    if (!protectedAreasPromise) {
        protectedAreasPromise = fetch(PROTECTED_AREAS_URL).then(r => r.json())
    }
    return protectedAreasPromise
}

const textPaint = {
    'text-color': '#2d6a2d',
    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
    'text-halo-width': 1.2,
} as const

export default {
    id: 'protectedAreas',
    name: 'Reserve & Park Names',
    description: 'Named reserves, parks, forests and historic sites, from OpenStreetMap and the NZGB Gazetteer',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result: data } = usePromise(getProtectedAreas, [])

        if (!data) return null

        return <Source id='protectedAreas' spec={{
            type: 'geojson',
            data,
        }}>
            <Layer layer={{
                id: 'protected-areas-fill-polygon',
                type: 'fill',
                source: 'protectedAreas',
                minzoom: PROTECTED_AREAS_MINZOOM,
                filter: ['==', ['geometry-type'], 'Polygon'],
                paint: {
                    'fill-color': '#2d6a2d',
                    'fill-opacity': 0.1,
                }
            }} />
            <Layer layer={{
                id: 'protected-areas-outline-polygon',
                type: 'line',
                source: 'protectedAreas',
                minzoom: PROTECTED_AREAS_MINZOOM,
                filter: ['==', ['geometry-type'], 'Polygon'],
                paint: {
                    'line-color': '#2d6a2d',
                    'line-width': 1,
                    'line-opacity': 0.5,
                    'line-dasharray': [2, 2],
                }
            }} />
            <Layer layer={{
                id: 'protected-areas-label-polygon',
                type: 'symbol',
                source: 'protectedAreas',
                minzoom: PROTECTED_AREAS_MINZOOM,
                filter: ['all',
                    ['==', ['geometry-type'], 'Polygon'],
                    sizeBasedVisibility('sizeKm', POLYGON_SIZE_STOPS),
                ],
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
                id: 'protected-areas-label-point',
                type: 'symbol',
                source: 'protectedAreas',
                minzoom: PROTECTED_AREAS_MINZOOM,
                filter: ['==', ['geometry-type'], 'Point'],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        11, 10,
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
