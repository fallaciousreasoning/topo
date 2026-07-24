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
 * Overlays whose on/off state is remembered per base layer (see
 * LayersControl.tsx's basemap switcher / settings.ts's
 * getRememberedOverlays/rememberOverlaysForBasemap) rather than carried over
 * unchanged when switching. These three read meaningfully differently
 * depending on which basemap they sit over - contours/hillshade are largely
 * redundant on the LINZ vector basemap, which already renders its own, and
 * Place Names' unfilled polygons (see waterFeatures.tsx etc) read
 * differently against a photographic vs a plain basemap - unlike
 * huts/mountains/tracks/hunting/etc, which don't meaningfully depend on the
 * basemap and so are just shared across all of them.
 */
export const PER_BASEMAP_OVERLAY_IDS: string[] = [hillshade.id, contours.id, placeNames.id]

/**
 * The overlays a base layer starts with the first time it's switched to -
 * used by LayersControl.tsx's basemap switcher when there's no remembered
 * set yet (see settings.ts's getRememberedOverlays/rememberOverlaysForBasemap)
 * - only the PER_BASEMAP_OVERLAY_IDS subset of this is actually used there,
 * since every other overlay is shared rather than per-basemap now, but it's
 * kept as a full set here since it doubles as the definition of "sensible
 * defaults for this kind of basemap" in general.
 * The LINZ vector basemap is detailed enough to carry every overlay except
 * hunting (a niche, visually heavy one - see hunting.tsx); every other,
 * plainer basemap just gets the two most broadly useful overlays instead of
 * being overwhelmed by all of them at once.
 */
export const defaultOverlaysForBasemap = (basemapId: string): string[] =>
    basemapId === linzVector.id
        ? overlays.filter(o => o.id !== hunting.id).map(o => o.id)
        : [huts.id, mountains.id]
