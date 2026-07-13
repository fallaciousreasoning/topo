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

// Only types with a matching LINZ Topo50 sprite icon get one - everything else
// stays text-only rather than reusing an icon that would misrepresent it.
// saddle/pass share the same "col" symbol LINZ itself uses for both (see e.g.
// "Engineer Col" on the raster maps - two opposing arcs).
const ICON_POINT_TYPES: [string, ...string[]] = ['saddle', 'pass']

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
            {/* Cliff edges get LINZ Topo50's own hachured cliff symbol, tiled along
                the line - all LineString features in this dataset are cliffs. */}
            <Layer layer={{
                id: 'landforms-line-cliff',
                type: 'line',
                source: 'landforms',
                minzoom: LANDFORMS_MINZOOM,
                filter: ['==', ['geometry-type'], 'LineString'],
                paint: {
                    'line-pattern': 'cliff_edge',
                    'line-width': 16,
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
                filter: ['all',
                    ['==', ['geometry-type'], 'Point'],
                    ['!', ['in', ['get', 'type'], ['literal', ICON_POINT_TYPES]]],
                ],
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
            <Layer layer={{
                id: 'landforms-label-point-icon',
                type: 'symbol',
                source: 'landforms',
                minzoom: LANDFORMS_MINZOOM,
                filter: ['all',
                    ['==', ['geometry-type'], 'Point'],
                    ['in', ['get', 'type'], ['literal', ICON_POINT_TYPES]],
                ],
                layout: {
                    'icon-image': 'saddle_pnt',
                    'icon-size': 1.2,
                    // Anchored at the icon's own centre (not 'bottom') so it rotates in
                    // place around the actual saddle coordinate, rather than swinging
                    // its base around that point as it turns to face different ways.
                    'icon-anchor': 'center',
                    // Most saddle/pass nodes carry OSM's direction=* tag - the compass
                    // bearing of travel *through* the pass (i.e. along the valley/road),
                    // not the ridge itself. The col symbol's two arcs need to open along
                    // the ridge, which runs transverse to that - hence the +90. Falls
                    // back to unrotated for the ~15% with no direction tag. 'map'
                    // alignment keeps it correct relative to true north as the map
                    // itself is panned/rotated.
                    'icon-rotate': ['+', 90, ['coalesce', ['get', 'direction'], 0]],
                    'icon-rotation-alignment': 'map',
                    'text-field': ['get', 'name'],
                    'text-anchor': 'top',
                    'text-offset': [0, 1.1],
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
