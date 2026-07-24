import { BaseLayerDefinition, OverlayDefinition } from "./config";
import contours from "./contours";
import hillshade from "./hillshade";
import hunting from "./hunting";
import huts from "./huts";
import linzAerial from "./linzAerial";
import linzVector from "./linzVector";
import mountains from "./mountains";
import openTopo from "./openTopo";
import osm from "./osm";
import placeNames from "./placeNames";
import points from "./points";
import slopeAngle from "./slopeAngle";
import topoRaster from "./topoRaster";
import utmGrid from "./utmGrid";
import tracksLayer from "./TracksLayer";

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
    placeNames,
    tracksLayer,
    hunting,
]

/**
 * The overlays a base layer starts with the first time it's switched to -
 * used by LayersControl.tsx's basemap switcher when there's no remembered
 * set yet (see settings.ts's getRememberedOverlays/rememberOverlaysForBasemap).
 * The LINZ vector basemap is detailed enough to carry every overlay except
 * hunting (a niche, visually heavy one - see hunting.tsx); every other,
 * plainer basemap just gets the two most broadly useful overlays instead of
 * being overwhelmed by all of them at once.
 */
export const defaultOverlaysForBasemap = (basemapId: string): string[] =>
    basemapId === linzVector.id
        ? overlays.filter(o => o.id !== hunting.id).map(o => o.id)
        : [huts.id, mountains.id]
