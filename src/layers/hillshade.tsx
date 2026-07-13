import { demSource, elevationEncoding, elevationScheme, maxContourZoom } from "./demSource"
import React from "react"
import { OverlayDefinition } from "./config"
import Source from '../map/Source'
import Layer from '../map/Layer'
import { CONTOUR_FLOOR_ID } from "../map/overlayFloor"

export default {
    id: 'hillshade',
    name: 'Hillshade',
    description: 'Hillshade tiles for the terrain',
    type: 'overlay',
    cacheable: false,
    // Pinned below CONTOUR_FLOOR_ID so contours always draw over the shading
    // rather than under it (which dulled the contour lines) - see overlayFloor.ts.
    source: <Layer key="hillshade" beforeId={CONTOUR_FLOOR_ID} layer={{
        id: 'hillshade', type: 'hillshade', source: 'terrainSource', paint: {
            "hillshade-exaggeration": 0.12,
        }
    }} />
} as OverlayDefinition
