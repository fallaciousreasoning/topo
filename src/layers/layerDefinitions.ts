import { TileCoord } from "ol/tilecoord";
import { linzAerialTileUrl } from "./linzAerialSource";
import { linzTopoSource } from "./linzTopoSource";

export interface BaseLayerDefinition {
    name: string;
    description: string;
}

export interface TileLayerDefinition {
    type: 'base';
    url: string | ((tile: TileCoord) => string);
}

export interface FeatureLayerDefinition {
    type: 'feature';
}

export type LayerDefinition = BaseLayerDefinition
    & (TileLayerDefinition | FeatureLayerDefinition);

export const layerDefinitions: LayerDefinition[] = [
    {
        name: "LINZ Topo",
        description: "The LINZ topographic map",
        type: "base",
        url: linzTopoSource,
    },
    {
        name: "Open Street Maps",
        description: "Street maps provided by openstreetmaps",
        type: 'base',
        url: ''
    },
    {
        name: "Open Topo Maps",
        description: "Topographic maps based on publicly available data",
        type: 'base',
        url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png'
    },
    {
        name: 'LINZ Aerial Imagery',
        description: "High resolution imagery of New Zealand, provided by LINZ",
        type: 'base',
        url: linzAerialTileUrl
    },
    {
        name: "NZ Live Weather",
        description: "Live weather, as reported from stations around New Zealand",
        type: 'feature'
    }
]