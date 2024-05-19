import React from "react";
import { MapStyle } from "react-map-gl";
import linzVector from "./linzVector";
import topoRaster from "./topoRaster";
import linzAerial from "./linzAerial";
import hillshade from "./hillshade";
import contours from "./contours";
import openTopo from "./openTopo";
import osm from "./osm";
import huts from "./huts";

export type BaseLayerDefinition = {
    id: string,
    name: string,
    version?: number
} & Pick<MapStyle, 'layers' | 'sources'>

export interface OverlayDefinition {
    id: string,
    name: string,
    source: React.JSX.Element | (() => React.JSX.Element)
}

export const extraData: Pick<MapStyle, 'glyphs' | 'sprite' | 'version'> = {
    version: 8,
    glyphs: "https://basemaps.linz.govt.nz/v1/fonts/{fontstack}/{range}.pbf",
    sprite: "https://basemaps.linz.govt.nz/v1/sprites/topographic"
}

export const baseLayers: BaseLayerDefinition[] = [
    linzVector,
    topoRaster,
    linzAerial,
    openTopo,
    osm
]

export const overlays: OverlayDefinition[] = [
    hillshade,
    contours,
    huts
]

export const getMapStyle = (definition: BaseLayerDefinition) => ({
    ...extraData,
    ...definition,
}) as MapStyle
