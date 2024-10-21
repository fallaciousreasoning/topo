import { LINZ_BASEMAPS_KEY } from "./config";
import { BaseLayerDefinition } from "./layerDefinition";

export default {
    id: 'linz-aerial',
    name: 'LINZ Aerial',
    type: 'base',
    cacheable: true,
    description: "High resolution aerial imagery of NZ",
    sources: {
        'linz-aerial': {
            type: 'raster',
            tiles: [
                `https://basemaps.linz.govt.nz/v1/tiles/aerial/EPSG:3857/{z}/{x}/{y}.webp?api=${LINZ_BASEMAPS_KEY}`
            ]
        }
    },
    layers: [
        {
            id: 'linz-aerial',
            type: 'raster',
            source: 'linz-aerial',
        }
    ]
} as BaseLayerDefinition
