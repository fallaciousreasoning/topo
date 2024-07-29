import { Layer, Source, useMap } from "react-map-gl/maplibre"
import { usePromise } from "../hooks/usePromise"
import React from "react"
import { useClusterHandlers } from "../hooks/useClusterHandlers"
import { useLayerHandler } from "../hooks/useLayerClickHandler"
import { useRouteUpdater } from "../routing/router"

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
            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [mountain.latlng![1], mountain.latlng![0]]
                },
                properties: {
                    name: mountain.name,
                    id: mountain.link
                }
            }
        }),
    }
    return geojson
}

export default {
    id: 'mountains',
    name: 'Mountains',
    source: () => {
        const { result } = usePromise(getFeatures, [])
        const updateRoute = useRouteUpdater()

        useClusterHandlers('mountains')
        useLayerHandler('click', 'mountains-unclustered-point', e => {
            const mountainFeature = e.features?.[0]
            if (!mountainFeature) return

            const name = mountainFeature.properties?.name
            if (!name) return

            updateRoute({
                page: `mountain/${encodeURIComponent(mountainFeature.properties.id)}`
            })

            // TODO: Open sidebar, when we support that sort of thing
        })
        if (!result) return

        return <Source id='mountains' type="geojson" data={result} cluster clusterMaxZoom={14}>
            <Layer id="mountains-clusters" type="circle" source="mountains" filter={['has', 'point_count']} paint={{
                'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 750, '#f28cb1'],
                'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40]
            }} />
            <Layer id='mountains-cluster-count'
                type='symbol'
                source='mountains'
                filter={['has', 'point_count']}
                layout={{
                    'text-field': '{point_count_abbreviated}',
                    'text-size': 12,
                    "text-font": [
                        "Open Sans Italic"
                    ],
                    'icon-image': 'triangle_pnt_fill',
                    "icon-anchor": 'right',
                    "text-anchor": 'left',
                    "text-justify": 'right'
                }} />
            <Layer id='mountains-unclustered-point'
                type='circle'
                source='mountains'
                filter={['!', ['has', 'point_count']]}
                paint={{
                    'circle-color': '#11b4da',
                    'circle-radius': 15,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff',
                }} />
            <Layer id='mountains-unclustered-point-icon'
                type='symbol'
                source='mountains'
                filter={['!', ['has', 'point_count']]}
                layout={{
                    "icon-image": 'triangle_pnt_fill',
                }} />
                <Layer id='mountains-unclustered-point-name'
                    type='symbol'
                    source='mountains'
                    filter={['!', ['has', 'point_count']]}
                    layout={{
                        'text-field': '{name}',
                        'text-size': 12,
                        "text-font": [
                            "Open Sans Italic"
                        ],
                        "icon-anchor": 'bottom',
                        "text-anchor": 'center',
                        "text-offset": [0, 2],
                        "text-justify": 'right'
                    }} />
        </Source>
    }
}
