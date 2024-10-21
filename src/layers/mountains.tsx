import React, { useEffect } from "react"
import { Layer, Source, useMap } from "react-map-gl/maplibre"
import Supercluster from "supercluster"
import { useLayerHandler } from "../hooks/useLayerClickHandler"
import { usePromise } from "../hooks/usePromise"
import { useRouteUpdater } from "../routing/router"
import { OverlayDefinition } from "./layerDefinition"

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

const getFeatures = async () => {
    const data = await getMountains()
    const points = Object.values(data).filter(r => r.latlng)
    const geojson: GeoJSON.GeoJSON = {
        type: 'FeatureCollection',
        features: points.filter(m => m.latlng).map(mountain => {
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
                    geometry
                }
            }
        }),
    }
    return geojson
}

const cluster = new Supercluster({
    maxZoom: 12,
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
        const map = useMap()

        useEffect(() => {
            if (!result) return
            const m = map.current!.getMap()
            cluster.load(result!.features as any);
            const updateCluster = () => {
                const zoom = Math.floor(m.getZoom())
                const clusters = cluster.getClusters([-180, -85, 180, 85], zoom);
                (m.getSource('mountains') as any).setData({
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
            for (const e of events) m.on(e, updateCluster)

            return () => {
                for (const e of events) m.on(e, updateCluster)
            }
        }, [result])

        const updateRoute = useRouteUpdater()

        useLayerHandler('click', 'mountains-point', e => {
            const mountainFeature = e.features?.[0]
            if (!mountainFeature) return

            const name = mountainFeature.properties?.name
            if (!name) return

            updateRoute({
                page: `mountain/${encodeURIComponent(mountainFeature.properties.id)}`
            })
        })
        if (!result) return

        return <Source id='mountains' type="geojson" data={{ type: 'FeatureCollection', features: [] }}>
            <Layer id='mountains-point'
                type='symbol'
                source='mountains'
                layout={{
                    'text-field': ['concat', ['get', 'name'], ' (', ['get', 'elevation'], 'm)'],
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
                }} />
        </Source>
    }
} as OverlayDefinition
