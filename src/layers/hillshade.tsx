import { demSource, elevationEncoding, elevationScheme, maxContourZoom } from "./demSource"
import React from "react"
import { OverlayDefinition } from "./config"
import Source from '../map/Source'
import Layer from '../map/Layer'

export default {
    id: 'hillshade',
    name: 'Hillshade',
    description: 'Hillshade tiles for the terrain',
    type: 'overlay',
    cacheable: false,
    source: <React.Fragment key='hillshade'>
        <Source id='hillshade' spec={{
            tileSize: 256,
            tiles: [demSource.sharedDemProtocolUrl],
            maxzoom: maxContourZoom,
            type: 'raster-dem',
            encoding: elevationEncoding,
            scheme: elevationScheme
        }} />
        <Layer layer={{
            id: 'hillshade', type: 'hillshade', source: 'terrain', paint: {
                "hillshade-exaggeration": 0.1,
            }
        }} />
    </React.Fragment>
} as OverlayDefinition
