import { Layer, Source } from "react-map-gl/maplibre"
import { demSource, elevationEncoding, elevationScheme, maxContourZoom } from "./contours"
import React from "react"
import { OverlayDefinition } from "./layerDefinition"

export default {
    id: 'hillshade',
    name: 'Hillshade',
    description: 'Hillshade tiles for the terrain',
    type: 'overlay',
    cacheable: false,
    source: <Source key='hillshade' id='hillshade' tileSize={256} tiles={[demSource.sharedDemProtocolUrl]} maxzoom={maxContourZoom} type='raster-dem' encoding={elevationEncoding} scheme={elevationScheme}>
        <Layer id="hillshade" type='hillshade' source='terrain' paint={{
            "hillshade-exaggeration": 0.1,
        }} />
    </Source>
} as OverlayDefinition
