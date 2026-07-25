import React from "react"
import Source from "../map/Source"
import { demSource, elevationEncoding, maxContourZoom } from "./demSource"

export default function Terrain() {
    return <Source id="terrainSource" spec={{
        type: 'raster-dem',
        tiles: [demSource.sharedDemProtocolUrl],
        encoding: elevationEncoding,
        maxzoom: maxContourZoom
      }}>
    </Source>
}
