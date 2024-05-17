import { BaseLayerDefinition } from "./layerDefinition";

export default {
    id: 'osm',
    name: 'Open Street Maps',
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
