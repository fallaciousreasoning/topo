import { BaseLayerDefinition, OverlayDefinition } from "./config";
import contours from "./contours";
import glaciers from "./glaciers";
import hillshade from "./hillshade";
import hunting from "./hunting";
import huts from "./huts";
import linzAerial from "./linzAerial";
import linzVector from "./linzVector";
import mountains from "./mountains";
import openTopo from "./openTopo";
import osm from "./osm";
import points from "./points";
import ridges from "./ridges";
import slopeAngle from "./slopeAngle";
import topoRaster from "./topoRaster";
import utmGrid from "./utmGrid";
import tracksLayer from "./TracksLayer";
import valleys from "./valleys";
import waterways from "./waterways";

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
    utmGrid,
    slopeAngle,
    huts,
    mountains,
    points,
    ridges,
    glaciers,
    valleys,
    waterways,
    tracksLayer,
    hunting,
]
