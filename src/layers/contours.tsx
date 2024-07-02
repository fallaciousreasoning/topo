import { Layer, Source } from "react-map-gl/maplibre";
import React from "react";
import contours from 'maplibre-contour'
import maplibre from 'maplibre-gl'

export const elevationEncoding = 'mapbox'
export const elevationScheme = 'tms'
export const maxContourZoom = 11

export const demSource = new contours.DemSource({
    encoding: elevationEncoding,
    // url: 'https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=U1fSkPeJnFmPcMub3C4o',
    // url: 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png',
    // url: 'http://localhost:8081/ele/{z}/{x}/{y}.png',
    url: 'https://pub-36de1a8a322545b9bd6ef274d5f46c7c.r2.dev/{z}/{x}/{y}.png',
    maxzoom: maxContourZoom,
    worker: true,
    cacheSize: 512,
    timeoutMs: 30000,
})

demSource.setupMaplibre(maplibre)

const far = [200, 1000]
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

export default {
    id: 'contour-source',
    name: 'Contours',
    source: <Source key='contour-source' id='contour-source' type='vector' tiles={[contourTiles]} maxzoom={maxContourZoom} scheme={elevationScheme}>
        <Layer id="contour-lines" type='line' source='contour-source' source-layer='contours' paint={{
            "line-color": "rgba(205, 128, 31, 0.5)",
            // level = highest index in thresholds array the elevation is a multiple of
            "line-width": ["match", ["get", "level"], 1, 2, 0.5],
        }} />
        <Layer id="contour-labels" type="symbol" source='contour-source' source-layer='contours' filter={[">", ["get", "level"], 0]}
            layout={{
                "symbol-placement": 'line',
                "text-size": 14,
                "text-field": ["concat", ["get", "ele"], "m"],
                "text-font": ["Open Sans Bold"],
            }}
            paint={{
                "text-halo-color": "white",
                "text-halo-width": 1,
            }} />
    </Source>
}
