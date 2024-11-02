import React from "react"
import Source from "../map/Source"
import { demSource, elevationEncoding, elevationScheme, maxContourZoom } from "./demSource"

export default function Terrain() {
    return <Source id="dem" spec={{
        type: 'raster-dem',
        tiles: [demSource.sharedDemProtocolUrl],
        encoding: elevationEncoding,
        ['scheme' as any]: elevationScheme,
        maxzoom: maxContourZoom
      }}>
    </Source>
}
