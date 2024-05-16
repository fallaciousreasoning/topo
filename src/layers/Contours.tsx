import { Layer, Source } from "react-map-gl/maplibre";
import { contourTiles, maxContourZoom } from "./contourSource";
import React from "react";

export default function Contours() {
    return <>
        <Source id='contour-source' type='vector' tiles={[contourTiles]} maxzoom={maxContourZoom}>
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
    </>
}
