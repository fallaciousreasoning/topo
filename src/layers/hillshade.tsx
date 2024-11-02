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
    source: <Layer key="hillshade" layer={{
        id: 'hillshade', type: 'hillshade', source: 'dem', paint: {
            "hillshade-exaggeration": 0.1,
        }
    }} />
} as OverlayDefinition
