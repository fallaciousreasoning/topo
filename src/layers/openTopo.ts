import { BaseLayerDefinition } from "./layerDefinition";

export default {
    id: 'open-topo-maps',
    name: 'Open Topo Maps',
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
