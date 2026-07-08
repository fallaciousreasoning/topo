import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";
import { sizeBasedVisibility } from "./labelSizing";

const GLACIERS_URL = '/data/glaciers.json'

// Small glaciers only reveal themselves once zoomed in close; the biggest
// icefields (~5km characteristic size) show from a wider view. See labelSizing.ts.
const GLACIER_SIZE_STOPS: [number, number][] = [
    [0.3, 12],
    [0.6, 11],
    [1.2, 10],
    [2.5, 9],
    [5, 8],
]

// Scales glacier label text to roughly fit inside each polygon's real-world size,
// using the standard "constant real-world size" MapLibre trick: an exponential
// (base 2) interpolation over zoom means the computed value doubles every zoom
// level, tracking how the polygon itself grows on screen. Approximate, not exact -
// MapLibre doesn't expose real glyph metrics to style expressions, and a single
// "characteristic size" can't capture an odd-shaped tongue-shaped glacier - but it
// keeps long names on small glaciers from looming way outside their outline.
const METERS_PER_PIXEL_AT_Z0_EQUATOR = 156543.03392
const REPRESENTATIVE_COS_LAT = Math.cos(43.5 * Math.PI / 180) // NZ glaciers cluster around -42 to -44
const PIXELS_PER_KM_AT_Z0 = 1000 / (METERS_PER_PIXEL_AT_Z0_EQUATOR * REPRESENTATIVE_COS_LAT)
const GLYPH_WIDTH_FACTOR = 0.55 // average glyph width as a fraction of font-size, italic proportional font
const FILL_FRACTION = 0.8 // target text width as a fraction of the glacier's characteristic size
const SIZE_TO_FONT_K = PIXELS_PER_KM_AT_Z0 * FILL_FRACTION / GLYPH_WIDTH_FACTOR

const MIN_TEXT_SIZE = 8
const MAX_TEXT_SIZE = 40

// MapLibre only allows a "zoom" expression as the direct top-level input to
// interpolate/step, not buried under another operator like min/max - so the
// interpolation domain is anchored at explicit zoom stops, with clamping done
// inside each stop's own output expression instead of wrapping the whole
// interpolate. A shrink multiplier is layered on top (fading out to 1 by
// zoom 14) so text reads smaller at a wide-ish zoom like 9-11 without
// changing the fully zoomed-in size.
const fitTextSizeAtZoom = (zoom: number, shrink = 1) => ['max', MIN_TEXT_SIZE, ['min', MAX_TEXT_SIZE,
    ['*', shrink, ['/', ['*', ['get', 'sizeKm'], SIZE_TO_FONT_K * Math.pow(2, zoom)], ['length', ['get', 'name']]]],
]] as const

let glaciersPromise: Promise<GeoJSON.FeatureCollection> | null = null

const getGlaciers = (): Promise<GeoJSON.FeatureCollection> => {
    if (!glaciersPromise) {
        glaciersPromise = fetch(GLACIERS_URL).then(r => r.json())
    }
    return glaciersPromise
}

export default {
    id: 'glaciers',
    name: 'Glacier Names',
    description: 'Named glaciers and snowfields, from OpenStreetMap',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result: data } = usePromise(getGlaciers, [])

        if (!data) return null

        return <Source id='glaciers' spec={{
            type: 'geojson',
            data,
        }}>
            {/* Single-way glaciers - real Polygon geometry, so MapLibre places the
                label inside the shape automatically. Text is sized to roughly fit. */}
            <Layer layer={{
                id: 'glaciers-label-polygon',
                type: 'symbol',
                source: 'glaciers',
                minzoom: 8,
                filter: ['all',
                    ['==', ['geometry-type'], 'Polygon'],
                    sizeBasedVisibility('sizeKm', GLACIER_SIZE_STOPS),
                ],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        9, fitTextSizeAtZoom(9, 0.6),
                        11, fitTextSizeAtZoom(11, 0.8),
                        14, fitTextSizeAtZoom(14, 1),
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.08,
                },
                paint: {
                    'text-color': '#1c5c8c',
                    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
                    'text-halo-width': 1.2,
                }
            }} />
            {/* Multipolygon relations reduced to a bbox centre, and gazetteer fallbacks -
                no polygon shape to fit text to, so a plain fixed size. */}
            <Layer layer={{
                id: 'glaciers-label-point',
                type: 'symbol',
                source: 'glaciers',
                minzoom: 9,
                filter: ['==', ['geometry-type'], 'Point'],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        9, 9,
                        11, 11.5,
                        14, 14,
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.08,
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
