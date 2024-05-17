import { Layer, Source } from "react-map-gl/maplibre"
import { demSource, elevationEncoding, maxContourZoom } from "./contours"
import React from "react"

export default {
    id: 'hillshade',
    name: 'Hillshade',
    source: <Source key='hillshade' id='dem' tileSize={256} tiles={[demSource.sharedDemProtocolUrl]} maxzoom={maxContourZoom} type='raster-dem' encoding={elevationEncoding}>
        <Layer id="hillshade" type='hillshade' source='terrain' />
    </Source>
}
