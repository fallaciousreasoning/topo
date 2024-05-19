import { Layer, Source, useMap } from "react-map-gl/maplibre"
import { usePromise } from "../hooks/usePromise"
import React from "react"
import { useClusterHandlers } from "../hooks/useClusterHandlers"
import { useLayerHandler } from "../hooks/useLayerClickHandler"
import { useRouteUpdater } from "../routing/router"

const fetchData = async () => {
    const response = await fetch('https://raw.githubusercontent.com/fallaciousreasoning/nz-mountains/main/mountains.json').then(r => r.json()) as any[]
    return response
}

const getFeatures = async () => {
    const data = await fetchData()
    const points = Object.values(data).filter(r => r.latlng)
    const geojson: GeoJSON.GeoJSON = {
        type: 'FeatureCollection',
        features: points.map(mountain => {
            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [mountain.latlng[1], mountain.latlng[0]]
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

            const point = mountainFeature.geometry as GeoJSON.Point

            updateRoute({
                lla: point.coordinates[1],
                llo: point.coordinates[0],
                lab: name
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
                    "icon-image": 'triangle_pnt_fill'
                }} />
        </Source>
    }
}
