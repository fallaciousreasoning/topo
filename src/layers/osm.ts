import { BaseLayerDefinition } from "./layerDefinition";

export default {
    id: 'osm',
    name: 'Open Street Maps',
    description: '',
    cacheable: true,
    type: 'base',
    sources: {
        osm: {
            id: 'osm',
            tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            type: 'raster'
        }
    },
    layers: [
        { id: 'osm', source: 'osm', type: 'raster' }
    ]
} as BaseLayerDefinition
