import { MapStyle } from "react-map-gl/maplibre";
import { BaseLayerDefinition, OverlayDefinition } from "./config";
import contours from "./contours";
import hillshade from "./hillshade";
import huts from "./huts";
import linzAerial from "./linzAerial";
import linzVector from "./linzVector";
import mountains from "./mountains";
import openTopo from "./openTopo";
import osm from "./osm";
import topoRaster from "./topoRaster";
import tracks from "./tracks";

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
    huts,
    mountains,
    tracks
]

export const getMapStyle = (definition: BaseLayerDefinition) => {
    const cachableSources = Object.entries(definition.sources)
        .reduce((prev, [source, value]) => {
            const cachableSource = 'tiles' in value ? {
                ...value,
                tiles: value.tiles!.map(t => t.replace('https://', 'maybe-cache://') + `#${definition.id}`)
            } : value
            return {
                ...prev,
                [source]: cachableSource
            }
        }, {})
    return {
        ...extraData,
        ...definition,
        sources: cachableSources
    } as MapStyle
}
