import { Layer, Source } from "react-map-gl/maplibre"
import { demSource, elevationEncoding, maxContourZoom } from "./contourSource"
import React from "react"

export default function Hillshade() {
    return <>
        <Source id='dem' tileSize={256} tiles={[demSource.sharedDemProtocolUrl]} maxzoom={maxContourZoom} type='raster-dem' encoding={elevationEncoding}>
            <Layer id="hillshade" type='hillshade' source='terrain' />
        </Source>
    </>
}
