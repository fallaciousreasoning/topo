import { BaseLayerDefinition, OverlayDefinition } from "./config";
import contours from "./contours";
import hillshade from "./hillshade";
import huts from "./huts";
import linzAerial from "./linzAerial";
import linzVector from "./linzVector";
import mountains from "./mountains";
import openTopo from "./openTopo";
import osm from "./osm";
import slopeAngle from "./slopeAngle";
import topoRaster from "./topoRaster";
import tracks from "./tracks";

export const extraData = {
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
    slopeAngle,
    huts,
    mountains,
    tracks
]
