import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";
import { sizeBasedVisibility } from "./labelSizing";

const RIDGES_URL = '/data/ridges.json'

// Scales text to roughly fit within the feature's own on-screen length, using the
// standard "constant real-world size" trick (see labelSizing.ts/glaciers.tsx) but
// also dividing by the name's character count - a bilingual name like "Ben Ohau
// Range / Te Tari-o-Mauka-Atua" (38 chars) needs much more contiguous straight
// line to fit than a short one like "Ben Ohau Range" (14 chars) at the same
// text-size, and OSM often splits one real range into several ways of very
// different lengths carrying different name variants. Sizing by length alone
// (the old approach) meant the long-named segments needed a straight run they
// usually didn't have, so they silently failed to place while short segments of
// the very same range worked fine.
const METERS_PER_PIXEL_AT_Z0_EQUATOR = 156543.03392
const REPRESENTATIVE_COS_LAT = Math.cos(43.5 * Math.PI / 180) // NZ ridges cluster around -42 to -44
const PIXELS_PER_KM_AT_Z0 = 1000 / (METERS_PER_PIXEL_AT_Z0_EQUATOR * REPRESENTATIVE_COS_LAT)
const GLYPH_WIDTH_FACTOR = 0.6 // average glyph width as a fraction of font-size, uppercase non-italic
const FILL_FRACTION = 0.65 // target text width as a fraction of the feature's own on-screen length
const SIZE_TO_FONT_K = PIXELS_PER_KM_AT_Z0 * FILL_FRACTION / GLYPH_WIDTH_FACTOR

const MIN_TEXT_SIZE = 11
const MAX_TEXT_SIZE = 26

// GeoJSON sources get tiled internally, and a long feature only ever offers as
// much straight line as fits within a single tile - the rest of its length is
// somewhere else entirely, clipped into a different tile. Sizing off the
// feature's *full* lengthKm (as if that much straight line were available in
// one place) is what let the long-named Ben Ohau Range segments (37.2km)
// demand far more contiguous pixels than any one tile could actually offer,
// even though the short-named segments of the very same range (12.7km) fit
// fine. Capping the length used for sizing keeps every feature's assumed
// budget within what a single tile can plausibly provide.
const MAX_SIZING_LENGTH_KM = 8

// MapLibre only allows a "zoom" expression as the direct top-level input to
// interpolate/step, not buried under another operator like min/max - so clamping
// happens inside each stop's own output expression instead of wrapping the whole
// interpolate (same pattern as glaciers.tsx).
const fitLineTextSizeAtZoom = (zoom: number, shrink = 1) => ['max', MIN_TEXT_SIZE, ['min', MAX_TEXT_SIZE,
    ['*', shrink, ['/', ['*', ['min', ['get', 'lengthKm'], MAX_SIZING_LENGTH_KM], SIZE_TO_FONT_K * Math.pow(2, zoom)], ['length', ['get', 'name']]]],
]] as const

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
            {/* TEMPORARY - visualises the actual ridge line geometry for debugging.
                Remove once done inspecting. */}
            {/* <Layer layer={{
                id: 'ridges-debug-line',
                type: 'line',
                source: 'ridges',
                filter: ['==', ['geometry-type'], 'LineString'],
                paint: {
                    'line-color': '#e91e63',
                    'line-width': 1.5,
                    'line-opacity': 0.8,
                }
            }} /> */}
            {/* Below zoom 10 the only thing revealed at all is the Southern Alps (see
                RIDGE_SIZE_STOPS) - it gets its own dedicated layer, rather than sharing
                one text-size expression with the zoom>=10 layer below, because of an
                empirically confirmed MapLibre quirk: merging this layer's simple 2-stop
                sizing into the *same* interpolate/step tree as the other layer's
                length/name-fit formula (even zoom-isolated via an outer 'step', and even
                when the far-away stops are replaced with harmless constants) makes
                placement fail ~100% of the time at zoom 6-7 - reproducible with the
                original pre-existing formula too, so this was a latent bug, not something
                introduced by later tuning. Keeping the expressions in fully separate layer
                objects avoids whatever cross-contamination causes that. */}
            <Layer layer={{
                id: 'ridges-label-alps',
                type: 'symbol',
                source: 'ridges',
                minzoom: 6,
                maxzoom: 10,
                filter: ['all',
                    ['==', ['get', 'source'], 'osm'],
                    sizeBasedVisibility('lengthKm', RIDGE_SIZE_STOPS),
                ],
                layout: {
                    // Line-placement needs a long-enough straight run of screen pixels to
                    // lay text along, and at this scale the whole 168km line only spans
                    // ~50-170px - not reliably enough for any label, so placement success
                    // became a coin flip depending on exact pan position. line-center
                    // doesn't have that problem (it just needs one point in view, anchored
                    // at the line's midpoint rather than plain 'point' mode's first-vertex
                    // anchor). (Plain 'point' mode is more reliable still at this zoom, but
                    // renders the text upright rather than following the line's angle,
                    // which looks detached from the ridge - line-center is worth the
                    // occasional placement miss to keep the text sitting on the line.)
                    'symbol-placement': 'line-center',
                    // The full bilingual name "Southern Alps / Kā Tiritiri o te Moana" (38
                    // chars) doesn't fit along the line at any legible size at this zoom -
                    // tested empirically to fail placement 100% of the time above ~10px
                    // text. Falling back to the short English name (only Southern Alps and
                    // Mount Cook Range actually differ from their full `name` - every other
                    // ridge's nameEn just duplicates it, so this is a no-op for any other
                    // feature that might ever reach this layer) leaves enough room to
                    // render at a normal, legible size.
                    'text-field': ['coalesce', ['get', 'nameEn'], ['get', 'name']],
                    'text-max-width': 40,
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        6, 15,
                        9, 19,
                    ],
                    'text-transform': 'uppercase',
                    'text-font': ['Open Sans Medium'],
                    'text-letter-spacing': 0.08,
                    'text-max-angle': 130,
                    // Nothing else is visible at this zoom, so there's nothing to usefully
                    // collide with - except a mountain peak label that happens to sit at
                    // the same anchor, which was silently swallowing it.
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                },
                paint: {
                    'text-color': '#2b1c0d',
                    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
                    'text-halo-width': 1.2,
                }
            }} />
            <Layer layer={{
                id: 'ridges-label',
                type: 'symbol',
                source: 'ridges',
                minzoom: 10,
                filter: ['all',
                    ['==', ['get', 'source'], 'osm'],
                    sizeBasedVisibility('lengthKm', RIDGE_SIZE_STOPS),
                ],
                layout: {
                    'symbol-placement': 'line',
                    // Deliberately left at MapLibre's default (250px) rather than the smaller
                    // real-world-constant spacing tried earlier - a tighter spacing packed
                    // repeats of the same label close enough together to collide with each
                    // other, which was silently costing Ben Ohau Range and similar ranges
                    // placements that the wider default spacing doesn't.
                    'symbol-sort-key': ['*', -1, ['get', 'lengthKm']],
                    'text-field': ['get', 'name'],
                    'text-max-width': 40,
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        11, fitLineTextSizeAtZoom(11, 1),
                        14, fitLineTextSizeAtZoom(14, 1),
                    ],
                    // LINZ's own raster maps set range/ridge names in caps, upright (not
                    // italic), in a dark warm brown - sampled directly from their tiles.
                    // Matched here as closely as the shared Open Sans glyph set allows
                    // (LINZ's own glyph endpoint only serves Open Sans, so the exact
                    // typeface isn't achievable without self-hosting custom font glyphs).
                    'text-transform': 'uppercase',
                    'text-font': ['Open Sans Medium'],
                    'text-letter-spacing': 0.08,
                    // Raised from 85 - Ben Ohau Range (and likely other genuinely zigzaggy
                    // ranges) has enough real jaggedness, even after simplification, to trip
                    // the default threshold and fail to place at all. A higher ceiling lets
                    // curvier real shapes still render, at the cost of allowing sharper bends
                    // in the text for the ranges that do use the full range of this value.
                    'text-max-angle': 130,
                },
                paint: {
                    'text-color': '#2b1c0d',
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
                    'text-transform': 'uppercase',
                    'text-size': 19,
                    'text-font': ['Open Sans Medium'],
                    'text-letter-spacing': 0.08,
                },
                paint: {
                    'text-color': '#2b1c0d',
                    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
                    'text-halo-width': 1.2,
                }
            }} />
        </Source>
    }
} as OverlayDefinition
