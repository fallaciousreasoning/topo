import BaseLayer from "ol/layer/Base";
import { TileCoord } from "ol/tilecoord";
import { pickRandom } from "../utils/random";

export interface BaseLayerDefinition {
    name: string;
    description: string;
}

export type TileLayerDefinition = BaseLayerDefinition & {
    type: 'base';
    url: string | ((tile: TileCoord) => string);
}

export interface FeatureLayerDefinition {
    type: 'feature';
}

export type LayerDefinition = BaseLayerDefinition
    & (TileLayerDefinition | FeatureLayerDefinition);

export const linzTopo: TileLayerDefinition =
{
    name: "LINZ Topo",
    description: "The LINZ topographic map",
    type: "base",
    url: ([z,x,y]: TileCoord) => {
        const layer = z < 13 ? '50798' : '50767';
        return `https://tiles-${pickRandom('abc')}.data-cdn.linz.govt.nz/services;key=d0772bed2204423f87157f7fb1223389/tiles/v4/layer=${layer}/EPSG:3857/${z}/${x}/${y}.png`;
    },
};

export const layerDefinitions: TileLayerDefinition[] = [
    linzTopo,
    {
        name: "Open Street Maps",
        description: "Street maps provided by openstreetmaps",
        type: 'base',
        url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
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
        url: ([z,x,y]: TileCoord) => {
            return `https://basemaps.linz.govt.nz/v1/tiles/aerial/EPSG:3857/${z}/${x}/${y}.webp?api=c01g1q2gnvqa6n7pdnjf0k8y50z`;
        }
    }
]
