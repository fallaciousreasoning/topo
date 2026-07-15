import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from '../map/Layer'
import Source from '../map/Source'
import { demSource, elevationScheme, maxContourZoom } from "./demSource";
import { LINZ_BASEMAPS_KEY } from "./config";
import { OVERLAY_FLOOR_ID } from "../map/overlayFloor";


const far = [200, 1000]
const close = [20, 100]
export const contourTiles = demSource.contourProtocolUrl({
    multiplier: 1,
    // maplibre-contour has a bug where the highest zoom key present in this
    // map has its major-interval value silently corrupted to null after the
    // first tile request at that zoom, which drops every index-contour label
    // ("100m elevations") from that point on - see the level>0 filter below.
    // Explicit entries all the way to maxContourZoom keep that corrupted key
    // pinned to a zoom nobody actually reaches, instead of 15/16 (in heavy
    // everyday use).
    thresholds: {
        10: far,
        11: far,
        12: close,
        13: close,
        14: close,
        15: close,
        16: close,
        17: close,
        18: close,
        19: close,
        20: close,
    },
    // used to color contour lines differently where they cross a glacier
    glacierUrlPattern: `maybe-cache://basemaps.linz.govt.nz/v1/tiles/topographic-v2/WebMercatorQuad/{z}/{x}/{y}.pbf?api=${LINZ_BASEMAPS_KEY}`,
    glacierMaxzoom: 12,
})

const abortController = new AbortController()
export const getElevation = (latlng: [number, number], zoom: number, controller = abortController): Promise<number> => (demSource.manager as any).getElevation(latlng, elevationScheme, Math.ceil(zoom), 4, controller)

export const demOverlaySource = {
    id: 'dem',
    name: "Digital Elevation Model",
    description: 'Elevation data for the terrain. Used to work out elevations, render contours, hillshade and 3d maps',
    cacheable: true,
    type: 'overlay'
} as const

export default {
    id: 'contour-source',
    name: 'Contours',
    description: 'Elevation data for the terrain. Used to render contours, hillshade and 3d maps',
    type: 'overlay',
    cacheable: false,
    defaultOpacity: 1,
    source: <React.Fragment key='contour-source'>
        <Source id='contour-source' spec={{
            type: 'vector',
            tiles: [contourTiles],
            maxzoom: maxContourZoom,
            scheme: elevationScheme
        }}>
            {/* beforeId keeps contours pinned to the very bottom of the overlay
                stack (directly above the base map, below every other overlay),
                regardless of what order overlays were toggled on in - see
                overlayFloor.ts. */}
            <Layer beforeId={OVERLAY_FLOOR_ID} layer={{
                id: 'contour-lines',
                type: 'line',
                source: 'contour-source',
                'source-layer': 'contours',
                paint: {
                    "line-color": ["case",
                        ["==", ["get", "glacier"], true], "rgba(52, 126, 191, 0.6)",
                        "#df8f22"
                    ],
                    // level = highest index in thresholds array the elevation is a multiple of
                    "line-width": ["match", ["get", "level"], 1, 2, 0.7],
                }
            }} />
            <Layer beforeId={OVERLAY_FLOOR_ID} layer={{
                id: 'contour-labels',
                type: 'symbol',
                source: 'contour-source',
                'source-layer': 'contours',
                filter: [">", ["get", "level"], 0],
                layout: {
                    "symbol-placement": 'line',
                    "text-size": 14,
                    "text-field": ["concat", ["get", "ele"], "m"],
                    "text-font": ["Open Sans Bold"],
                },
                paint: {
                    "text-halo-color": "white",
                    "text-halo-width": 1,
                }
            }} />
        </Source>
    </React.Fragment >
} as OverlayDefinition
