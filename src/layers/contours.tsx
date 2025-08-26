import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from '../map/Layer'
import Source from '../map/Source'
import { demSource, elevationScheme, maxContourZoom } from "./demSource";


const far = [200, 1000]
const mid = [100, 500]
const close = [20, 100]
export const contourTiles = demSource.contourProtocolUrl({
    multiplier: 1,
    thresholds: {
        10: far,
        11: close,
        12: close,
        14: close,
        15: close,
    },

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
            <Layer layer={{
                id: 'contour-lines',
                type: 'line',
                source: 'contour-source',
                'source-layer': 'contours',
                paint: {
                    "line-color": "rgba(205, 128, 31, 0.5)",
                    // level = highest index in thresholds array the elevation is a multiple of
                    "line-width": ["match", ["get", "level"], 1, 2, 0.7],
                }
            }} />
            <Layer layer={{
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
