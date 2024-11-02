import contours from 'maplibre-contour'
import * as protocols from '../caches/protocols'

const elevationData =
    // custom
    //   {
    //     url: 'maybe-cache://pub-36de1a8a322545b9bd6ef274d5f46c7c.r2.dev/{z}/{x}/{y}.png',
    //     scheme: 'tms',
    //     encoding: 'mapbox'
    //   }
    // amazon
    // {
    //   url: 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png',
    //   scheme: 'xyz',
    //   encoding: 'terrarium'
    // }

    // linz
    {
        url: 'maybe-cache://basemaps.linz.govt.nz/v1/tiles/elevation/WebMercatorQuad/{z}/{x}/{y}.png?api=c01jabmxaqt7s9nd8ak0tw7yjgk&pipeline=terrain-rgb#dem',
        scheme: 'xyz',
        encoding: 'mapbox'
    } as const

export const { encoding: elevationEncoding, scheme: elevationScheme } = elevationData
export const maxContourZoom = 20
export const minContourZoom = 6

export const demSource = new contours.DemSource({
    encoding: elevationEncoding,
    // url: 'https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=U1fSkPeJnFmPcMub3C4o',
    // url: 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png',
    // url: 'http://localhost:8081/ele/{z}/{x}/{y}.png',
    url: elevationData.url,
    maxzoom: maxContourZoom,
    worker: true,
    cacheSize: 512,
    timeoutMs: 30000,
    minzoom: minContourZoom
})

demSource.setupMaplibre(protocols)
