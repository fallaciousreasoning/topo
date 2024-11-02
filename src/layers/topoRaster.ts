import { BaseLayerDefinition } from "./config";

export default {
    id: 'topo-raster',
    name: 'LINZ Topo50',
    description: 'The classic LINZ topo50 series of maps',
    type: 'base',
    cacheable: true,
    sources: {
        topo50: {
            id: 'topo50',
            type: 'raster',
            tiles: [
                `maybe-cache://tiles-a.data-cdn.linz.govt.nz/services;key=d0772bed2204423f87157f7fb1223389/tiles/v4/layer=50767/EPSG:3857/{z}/{x}/{y}.png`
            ],
            minzoom: 13,
        },
        topo250: {
            id: 'topo250',
            type: 'raster',
            tiles: [
                `https://tiles-a.data-cdn.linz.govt.nz/services;key=d0772bed2204423f87157f7fb1223389/tiles/v4/layer=50798/EPSG:3857/{z}/{x}/{y}.png`,
            ],
            minzoom: 0,
            maxzoom: 13,
        }
    },
    layers: [
        { id: 'topo250', type: 'raster', source: 'topo250', maxzoom: 13 },
        { id: 'topo50', type: 'raster', source: 'topo50', minzoom: 13 },
    ]
} as BaseLayerDefinition
