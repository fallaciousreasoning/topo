import { BaseLayerDefinition } from "./config";

export default {
    id: 'open-topo',
    name: 'Open Topo Maps',
    description: 'Maps generated from the open topo map data',
    cacheable: true,
    type: 'base',
    sources: {
        'open-topo': {
            id: 'open-topo',
            tiles: [
                'https://a.tile.opentopomap.org/{z}/{x}/{y}.png'
            ],
            type: 'raster'
        }
    },
    layers: [
        { id: 'open-topo', source: 'open-topo', type: 'raster' }
    ]
} as BaseLayerDefinition
