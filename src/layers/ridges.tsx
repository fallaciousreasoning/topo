import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";
import { sizeBasedVisibility, realWorldPixels } from "./labelSizing";

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
                    // Below zoom 10 the only thing revealed at all is the Southern Alps
                    // (see RIDGE_SIZE_STOPS). Line-placement needs a long-enough straight
                    // run of screen pixels to lay text along, and at that scale the whole
                    // 168km line only spans ~50-170px - not reliably enough for any label,
                    // so placement success became a coin flip depending on exact pan
                    // position. A point anchor doesn't have that problem (it just needs
                    // one point in view), so switch modes entirely below zoom 10 - since
                    // nothing else is visible there anyway, this only affects the Alps.
                    'symbol-placement': ['step', ['zoom'], 'point', 10, 'line'],
                    // LINZ's raster maps place each range name exactly once - a human
                    // cartographer chose the spot. A fixed-pixel symbol-spacing repeats the
                    // label every so many pixels, which for a long range means several
                    // copies visible at once. symbol-spacing can't be a per-feature (data)
                    // expression, only zoom, so this uses a fixed real-world distance
                    // (250km) comfortably bigger than the longest ridge (168km) rather than
                    // each feature's own length - meaning every feature gets one label, not
                    // that every feature's spacing is individually tuned.
                    'symbol-spacing': realWorldPixels(250),
                    'symbol-sort-key': ['*', -1, ['get', 'lengthKm']],
                    // Point placement (below zoom 10 - see symbol-placement above) doesn't
                    // need a long straight run to lay text along like line-placement does,
                    // so the full bilingual name fits fine even at low zoom - keep it on one
                    // line rather than the default wrap (line-placement ignores this).
                    'text-field': ['get', 'name'],
                    'text-max-width': 40,
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        6, 15,
                        9, ['interpolate', ['linear'], ['get', 'lengthKm'], 1, 12, 10, 15, 50, 21],
                        11, ['interpolate', ['linear'], ['get', 'lengthKm'], 1, 14, 10, 18, 50, 23],
                        14, ['interpolate', ['linear'], ['get', 'lengthKm'], 1, 18, 10, 23, 50, 29],
                    ],
                    // LINZ's own raster maps set range/ridge names in caps, upright (not
                    // italic), in a dark warm brown - sampled directly from their tiles.
                    // Matched here as closely as the shared Open Sans glyph set allows
                    // (LINZ's own glyph endpoint only serves Open Sans, so the exact
                    // typeface isn't achievable without self-hosting custom font glyphs).
                    'text-transform': 'uppercase',
                    'text-font': ['Open Sans Medium'],
                    'text-letter-spacing': 0.08,
                    'text-max-angle': 85,
                    // Below zoom 10 the Southern Alps is the only feature this layer ever
                    // shows, so there's nothing for it to usefully collide with - except a
                    // mountain peak label that happens to sit at the same point-placement
                    // anchor, which was silently swallowing it. Skip collision there;
                    // restore normal decluttering at zoom 10+ where many labels compete.
                    'text-allow-overlap': ['step', ['zoom'], true, 10, false],
                    'text-ignore-placement': ['step', ['zoom'], true, 10, false],
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
