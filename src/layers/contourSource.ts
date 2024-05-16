import contours from 'maplibre-contour'
import maplibre from 'maplibre-gl'

export const elevationEncoding = 'mapbox'
export const maxContourZoom = 12

export const demSource = new contours.DemSource({
    encoding: elevationEncoding,
    url: 'https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=U1fSkPeJnFmPcMub3C4o',
    // encoding: 'terrarium',
    // url: 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png',
    // url: 'http://localhost:3000/{z}/{x}/{y}.png',
    maxzoom: maxContourZoom,
    worker: true,
    cacheSize: 512,
    timeoutMs: 30000,
})

demSource.setupMaplibre(maplibre)

const far = [200, 1000]
const close = [20, 100]
export const contourTiles = demSource.contourProtocolUrl({
    multiplier: 1,
    thresholds: {
        10: far,
        11: close,
        12: close,
        14: close,
        15: close,
    },

})
