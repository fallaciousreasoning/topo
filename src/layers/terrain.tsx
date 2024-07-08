import React from "react"
import { Source } from "react-map-gl/maplibre"
import { demSource, elevationEncoding, elevationScheme, maxContourZoom } from "./contours"

export default function Terrain() {
    return <Source key='terrain' id="dem" type="raster-dem" tiles={[demSource.sharedDemProtocolUrl]} encoding={elevationEncoding} scheme={elevationScheme} maxzoom={maxContourZoom}>
    </Source>
}
