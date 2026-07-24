import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";

const LOCALITIES_URL = '/data/localities.json'

// Localities are dense (~4800 nationwide) and mostly low-priority next to
// named landforms/water features already shown at lower zooms - held back
// until 11 to stay out of the way of those, same floor as valleys/geological
// features.
const LOCALITIES_MINZOOM = 11

let localitiesPromise: Promise<GeoJSON.FeatureCollection> | null = null

const getLocalities = (): Promise<GeoJSON.FeatureCollection> => {
    if (!localitiesPromise) {
        localitiesPromise = fetch(LOCALITIES_URL).then(r => r.json())
    }
    return localitiesPromise
}

export default {
    id: 'localities',
    name: 'Locality Names',
    description: 'Named localities (rural settlements, ski fields, and other informally-named places) from OpenStreetMap and the NZGB Gazetteer',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result: data } = usePromise(getLocalities, [])

        if (!data) return null

        return <Source id='localities' spec={{
            type: 'geojson',
            data,
        }}>
            <Layer layer={{
                id: 'localities-label-point',
                type: 'symbol',
                source: 'localities',
                minzoom: LOCALITIES_MINZOOM,
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': 13,
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.06,
                },
                paint: {
                    'text-color': '#54544a',
                    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
                    'text-halo-width': 1.2,
                }
            }} />
        </Source>
    }
} as OverlayDefinition
