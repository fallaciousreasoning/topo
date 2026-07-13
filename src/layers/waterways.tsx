import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";
import { useHideBaseMapLayers } from "../hooks/useHideBaseMapLayers";
import { sizeBasedVisibility, realWorldPixels } from "./labelSizing";

const WATERWAYS_URL = '/data/waterways.json'

// LINZ's base map labels named rivers (e.g. "Omeoroa River") itself, straight
// off the water_lines source-layer - hidden while this overlay is on so a
// river's name doesn't show twice. It has no equivalent stream-names layer,
// so streams don't need the same treatment.
const LINZ_RIVER_NAME_LAYERS = ['All-Waterway-River-Names']

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

// Shared layout/paint for every zoom-banded label layer below - only minzoom,
// maxzoom and text-size actually differ between bands.
const baseLayout = {
    'symbol-placement': 'line',
    // See the matching comment in ridges.tsx - a shorter real-world repeat
    // distance than the feature's own length trades "LINZ shows each name
    // once" for a much better chance the label actually shows up somewhere
    // in the current view.
    'symbol-spacing': realWorldPixels(70),
    'symbol-sort-key': ['*', -1, ['get', 'lengthKm']],
    'text-field': ['get', 'name'],
    'text-font': ['Open Sans Italic'],
    'text-letter-spacing': 0.06,
    'text-max-angle': 85,
} as const

const basePaint = {
    'text-color': '#1c5c8c',
    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
    'text-halo-width': 1.2,
} as const

// Each band gets its own layer with a *zoom-constant* (lengthKm-only) text-size,
// rather than one shared layer with a single zoom-interpolated text-size across
// all bands. This works around an empirically confirmed MapLibre quirk: a
// zoom-interpolate whose *later* stop computes too large a value can silently
// reject line-placement at an *earlier*, currently-active zoom, even when that
// zoom's own value would fit fine on its own. Maitland Stream (14.5km) fell
// exactly into this trap at zoom 11 purely because of the zoom-14 stop's value,
// despite zoom 11's own computed size being reasonable in isolation. Splitting
// by real minzoom/maxzoom on separate layers (rather than interpolating within
// one) sidesteps this entirely, at the cost of a size step at each band boundary
// instead of continuous growth.
const BANDS: { minzoom: number, maxzoom?: number, sizeStops: [number, number][] }[] = [
    { minzoom: 7, maxzoom: 11, sizeStops: [[0.2, 8], [1, 10], [10, 12], [50, 15]] },
    { minzoom: 11, maxzoom: 14, sizeStops: [[0.2, 10], [1, 12], [10, 14], [50, 18]] },
    { minzoom: 14, sizeStops: [[0.2, 12], [1, 15], [10, 18], [50, 23]] },
]

export default {
    id: 'waterways',
    name: 'River & Stream Names',
    description: 'Named rivers and streams, from OpenStreetMap. Minor streams only appear when zoomed in close.',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result: data } = usePromise(getWaterways, [])
        useHideBaseMapLayers(LINZ_RIVER_NAME_LAYERS)

        if (!data) return null

        return <Source id='waterways' spec={{
            type: 'geojson',
            data,
        }}>
            {BANDS.map(({ minzoom, maxzoom, sizeStops }) => (
                <Layer key={minzoom} layer={{
                    id: `waterways-label-z${minzoom}`,
                    type: 'symbol',
                    source: 'waterways',
                    minzoom,
                    ...(maxzoom !== undefined ? { maxzoom } : {}),
                    filter: sizeBasedVisibility('lengthKm', WATERWAY_SIZE_STOPS),
                    layout: {
                        ...baseLayout,
                        'text-size': ['interpolate', ['linear'], ['get', 'lengthKm'],
                            ...sizeStops.flatMap(([size, textSize]) => [size, textSize]),
                        ],
                    },
                    paint: basePaint,
                }} />
            ))}
        </Source>
    }
} as OverlayDefinition
