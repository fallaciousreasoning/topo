// Web Worker: decodes a parent MVT tile, clips it to one quadrant, and rescales it into a
// full tile - the vector equivalent of rasterFallback.ts's crop-and-upscale. Runs off the
// main thread because protobuf decode/clip/encode is heavy enough to jank the map, unlike
// the raster crop (a cheap OffscreenCanvas draw) that runs inline.
//
// Static import (not dynamic): vite bundles worker entries as a single iife chunk by default
// in this project, which can't be code-split, so a dynamic import() here would fail the build.
import Pbf from 'pbf'
import { VectorTile } from '@mapbox/vector-tile'
import { fromVectorTileJs, type VectorTileFeatureLike, type VectorTileLayerLike, type VectorTileLike } from '@maplibre/vt-pbf'
import { clipAndRescale, GeomType } from './tileClip'

export interface ClipRequest {
    type: 'CLIP_QUADRANT'
    id: string
    data: ArrayBuffer
    right: boolean
    bottom: boolean
}

export interface ClipResponse {
    type: 'CLIP_COMPLETE'
    id: string
    data: ArrayBuffer | null
}

function clipQuadrant(data: ArrayBuffer, right: boolean, bottom: boolean): ArrayBuffer | null {
    const tile = new VectorTile(new Pbf(new Uint8Array(data)))
    const layers: VectorTileLike['layers'] = {}

    for (const name in tile.layers) {
        const layer = tile.layers[name]
        const extent = layer.extent
        const box = {
            xMin: right ? extent / 2 : 0,
            xMax: right ? extent : extent / 2,
            yMin: bottom ? extent / 2 : 0,
            yMax: bottom ? extent : extent / 2,
        }

        const features: VectorTileFeatureLike[] = []
        for (let i = 0; i < layer.length; i++) {
            const feature = layer.feature(i)
            const geometry = clipAndRescale(feature.loadGeometry(), feature.type as GeomType, box, extent)
            if (geometry.length === 0) continue
            features.push({
                type: feature.type,
                properties: feature.properties,
                id: feature.id,
                extent,
                loadGeometry: () => geometry,
            })
        }
        if (features.length === 0) continue

        const clippedLayer: VectorTileLayerLike = {
            version: layer.version,
            name,
            extent,
            length: features.length,
            feature: i => features[i],
        }
        layers[name] = clippedLayer
    }

    if (Object.keys(layers).length === 0) return null

    const encoded = fromVectorTileJs({ layers })
    return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer
}

self.addEventListener('message', (event: MessageEvent<ClipRequest>) => {
    const { id, data, right, bottom } = event.data
    let result: ArrayBuffer | null
    try {
        result = clipQuadrant(data, right, bottom)
    } catch {
        result = null
    }

    const response: ClipResponse = { type: 'CLIP_COMPLETE', id, data: result }
    if (result) {
        self.postMessage(response, [result])
    } else {
        self.postMessage(response)
    }
})
