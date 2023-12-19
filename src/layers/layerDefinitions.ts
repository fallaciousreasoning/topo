import BaseLayer from "ol/layer/Base";
import { TileCoord } from "ol/tilecoord";
import { pickRandom } from "../utils/random";
import RenderEvent from "ol/render/Event";

export interface BaseLayerDefinition {
    id: string;
    name: string;
    description: string;
    defaultVisible?: boolean;
}

export type TileLayerDefinition = BaseLayerDefinition & {
    type: 'base' | 'overlay';
    url: string | ((tile: TileCoord) => string);
    prerender?: (e: RenderEvent) => void
}

export interface FeatureLayerDefinition {
    type: 'feature';
}

export type LayerDefinition = BaseLayerDefinition
    & (TileLayerDefinition | FeatureLayerDefinition);

export const linzTopo: TileLayerDefinition =
{
    id: 'linz-topo',
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
        id: 'osm',
        name: "Open Street Maps",
        description: "Street maps provided by openstreetmaps",
        type: 'base',
        url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    },
    {
        id: 'open-topo-maps',
        name: "Open Topo Maps",
        description: "Topographic maps based on publicly available data",
        type: 'base',
        url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png'
    },
    {
        id: 'linz-arial',
        name: 'LINZ Aerial Imagery',
        description: "High resolution imagery of New Zealand, provided by LINZ",
        type: 'base',
        url: ([z,x,y]: TileCoord) => {
            return `https://basemaps.linz.govt.nz/v1/tiles/aerial/EPSG:3857/${z}/${x}/${y}.webp?api=d01fbtg0ar3v159zx4e0ajt0n09`;
        }
    },
    {
        id: 'hillshade',
        name: "Hillshade",
        description: "Terrain relief overlay",
        type: 'overlay',
        defaultVisible: true,
        prerender: e => e.context.canvas.getContext('2d').globalCompositeOperation = 'multiply',
        url: 'https://tiles-cdn.koordinates.com/services;key=d0772bed2204423f87157f7fb1223389/tiles/v4/layer=50765/EPSG:3857/{z}/{x}/{y}.png'
    }
]
