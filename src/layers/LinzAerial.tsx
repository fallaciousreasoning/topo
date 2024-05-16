import { Layer, Source } from "react-map-gl/maplibre";
import { LINZ_BASEMAPS_KEY } from "./config";
import * as React from 'react'

export default function LinzAerial() {
    return <Source id='linz-aerial' type="raster" tiles={[
        `https://basemaps.linz.govt.nz/v1/tiles/aerial/EPSG:3857/{z}/{x}/{y}.webp?api=${LINZ_BASEMAPS_KEY}`
    ]}>
        <Layer id="linz-aerial" type="raster" />
    </Source>
}
