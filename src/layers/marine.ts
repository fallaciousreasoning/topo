import { LINZ_BASEMAPS_KEY } from "./config";
import { BaseLayerDefinition } from "./config";

export default {
    id: 'marine',
    name: 'Marine Charts',
    type: 'base',
    cacheable: true,
    description: "LINZ marine nautical charts",
    sources: {
        'marine': {
            type: 'raster',
            tiles: [
                `https://basemaps.linz.govt.nz/v1/tiles/charts/WebMercatorQuad/{z}/{x}/{y}.webp?api=${LINZ_BASEMAPS_KEY}`
            ],
            tileSize: 256,
        }
    },
    layers: [
        {
            id: 'marine',
            type: 'raster',
            source: 'marine',
        }
    ]
} as BaseLayerDefinition
