import { BaseLayerDefinition } from "./config";

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
            tileSize: 128,
            type: 'raster'
        }
    },
    layers: [
        { id: 'osm', source: 'osm', type: 'raster' }
    ]
} as BaseLayerDefinition
