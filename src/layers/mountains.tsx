import React, { useEffect } from "react"
import Supercluster from "supercluster"
import { useLayerHandler } from "../hooks/useLayerClickHandler"
import { usePromise } from "../hooks/usePromise"
import { useRouteUpdater } from "../routing/router"
import { OverlayDefinition } from "./config"
import Source from "../map/Source"
import Layer from "../map/Layer"
import { useMap } from "../map/Map"

export interface MountainPitch {
    alpine?: string,
    commitment?: string,
    mtcook?: string,
    aid?: string,
    ice?: string,
    mixed?: string,
    length?: string,
    bolts?: string,
    trad: false,
    ewbank?: string,
    description?: string
}
export interface MountainRoute {
    link: string
    name: string,
    grade?: string,
    topo_ref?: string,
    image: string,
    images: { src: string, width: number, height: number }[],
    length?: string,
    pitches: MountainPitch[],
    quality: number,
    bolts: number,
    natural_pro: boolean,
    description?: string,
    ascent?: string
}
export interface Mountain {
    name: string;
    link: string;
    latlng?: [number, number],
    altitude: string,
    access?: string,
    description?: string,
    routes: MountainRoute[],
    places: Mountain[],
    image: string,
    images: {
        src: string,
        width: number,
        height: number
    }[]
}

const fetchMountains = (): Promise<{ [id: string]: Mountain }> => {
    return fetch('https://raw.githubusercontent.com/fallaciousreasoning/nz-mountains/main/mountains.json').then(r => r.json())
}

let mountainsPromise: Promise<{ [id: string]: Mountain }>
export const getMountains = () => {
    if (!mountainsPromise) {
        mountainsPromise = fetchMountains()
            .catch(() => ({}))
    }
    return mountainsPromise
}

const PEAKS_URL = '/data/peaks.json'

// climbnz only documents peaks notable enough to have climbing route info -
// a small fraction of the NZGB Gazetteer's ~7300 named peaks (see
// scripts/update_peaks.py). Without this, every other named peak is
// invisible on this overlay - merged in here as plain points with no
// route/photo data, distinguished by properties.source for the click handler
// and label below.
const getGazetteerPeaks = (): Promise<GeoJSON.FeatureCollection> =>
    fetch(PEAKS_URL).then(r => r.json()).catch(() => ({ type: 'FeatureCollection', features: [] }))

const getFeatures = async () => {
    const [data, gazetteerPeaks] = await Promise.all([getMountains(), getGazetteerPeaks()])
    const points = Object.values(data).filter(r => r.latlng)
    const climbnzFeatures = points.filter(m => m.latlng).map(mountain => {
        const geometry = {
            type: 'Point',
            coordinates: [mountain.latlng![1], mountain.latlng![0]]
        } as any;
        return {
            type: 'Feature',
            geometry,
            properties: {
                name: mountain.name,
                id: mountain.link,
                elevation: parseInt(mountain.altitude) || 0,
                source: 'climbnz',
                geometry
            }
        }
    })

    const gazetteerFeatures = gazetteerPeaks.features.map(peak => {
        const geometry = peak.geometry as any
        return {
            type: 'Feature',
            geometry,
            properties: {
                name: peak.properties!.name,
                elevation: 0,
                source: 'gazetteer',
                geometry
            }
        }
    })

    const geojson: GeoJSON.GeoJSON = {
        type: 'FeatureCollection',
        features: [...climbnzFeatures, ...gazetteerFeatures],
    }
    return geojson
}

/** climbnz peaks always carry a real elevation; gazetteer-only ones don't -
 * omit the "(0m)" suffix for those rather than showing a bogus elevation. */
const peakLabel = (name: unknown, elevation: unknown) =>
    typeof elevation === 'number' && elevation > 0 ? `${name} (${elevation}m)` : `${name}`

const cluster = new Supercluster({
    maxZoom: 10,
    reduce: (accumulator, current) => {
        if (!accumulator.occurrence || accumulator.occurrence.elevation < current.occurrence.elevation) {
            accumulator.occurrence = current.occurrence;
        }
    }
});

export default {
    id: 'mountains',
    name: 'Mountains',
    description: 'Mountains, and route information in NZ',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result } = usePromise(getFeatures, [])
        const { map } = useMap()

        useEffect(() => {
            if (!result) return
            cluster.load(result!.features as any);
            const updateCluster = () => {
                const zoom = Math.floor(map.getZoom())
                const clusters = cluster.getClusters([-180, -85, 180, 85], zoom);
                (map.getSource('mountains') as any)?.setData({
                    type: 'FeatureCollection',
                    features: clusters.map(m => {
                        if (!m.id) return m
                        return {
                            ...m,
                            geometry: m.properties.geometry
                        }
                    })
                })
            }

            updateCluster()
            const events = ['zoom']
            for (const e of events) map.on(e, updateCluster)

            return () => {
                for (const e of events) map.on(e, updateCluster)
            }
        }, [result])

        const updateRoute = useRouteUpdater()

        useLayerHandler('click', 'mountains-point', e => {
            const mountainFeature = e.features?.[0]
            if (!mountainFeature) return

            const name = mountainFeature.properties?.name
            const elevation = mountainFeature.properties?.elevation
            if (!name) return

            const coords = mountainFeature.geometry.coordinates
            const label = peakLabel(name, elevation)

            updateRoute({
                page: `location/${coords[1]}/${coords[0]}/${encodeURIComponent(label)}`
            })
        })
        if (!result) return

        return <Source id='mountains' spec={{
            type: "geojson",
            data: {
                type: 'FeatureCollection',
                features: []
            }
        }} >
            <Layer layer={{
                id: 'mountains-point',
                type: 'symbol',
                source: 'mountains',
                layout: {
                    'text-field': ['case',
                        ['>', ['get', 'elevation'], 0],
                        ['concat', ['get', 'name'], ' (', ['get', 'elevation'], 'm)'],
                        ['get', 'name'],
                    ],
                    'text-size': 12,
                    "text-font": [
                        "Open Sans Italic"
                    ],
                    'icon-image': 'triangle_pnt_fill',
                    "icon-anchor": 'bottom',
                    "text-anchor": 'center',
                    "text-offset": [0, .5],
                    "text-max-width": 100,
                    "text-justify": 'right'
                }
            }} />
        </ Source>
    }
} as OverlayDefinition
