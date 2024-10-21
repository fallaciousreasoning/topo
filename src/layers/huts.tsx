import React from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import { useClusterHandlers } from "../hooks/useClusterHandlers";
import { useLayerHandler } from "../hooks/useLayerClickHandler";
import { usePromise } from "../hooks/usePromise";
import { useRouteUpdater } from "../routing/router";
import { Place } from "../search/places";
import { OverlayDefinition } from "./layerDefinition";

const fetchData = async () => {
    const url = "/data/huts.json"
    const response = await fetch(url);
    const data = await response.json() as any[];
    for (const hut of data) {
        hut.type = 'hut'
    }

    const huts = data as Place[]
    const geojson: GeoJSON.GeoJSON = {
        type: 'FeatureCollection',
        features: huts.map(h => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [
                    parseFloat(h.lon),
                    parseFloat(h.lat)
                ]
            },
            properties: {
                message: h.name,
            }
        })),

    }

    return geojson
}

export default {
    id: 'huts',
    name: 'Huts',
    description: 'NZ Backcountry Huts',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result } = usePromise(fetchData, [])
        const updateRoute = useRouteUpdater()

        useLayerHandler('click', 'huts-unclustered-point', e => {
            const hutFeature = e.features?.[0]
            if (!hutFeature) return

            const hutName = hutFeature.properties?.message
            if (!hutName) return

            const point = hutFeature.geometry as GeoJSON.Point

            updateRoute({
                lla: point.coordinates[1],
                llo: point.coordinates[0],
                lab: hutName
            })
        })

        useClusterHandlers('huts')

        if (!result) return null
        return <Source id="huts" type="geojson" data={result} cluster clusterMaxZoom={14}>
            <Layer id="huts-clusters" type="circle" source="huts" filter={['has', 'point_count']} paint={{
                'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 750, '#f28cb1'],
                'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40]
            }} />
            <Layer id='huts-cluster-count'
                type='symbol'
                source='huts'
                filter={['has', 'point_count']}
                layout={{
                    'text-field': '{point_count_abbreviated}',
                    'text-size': 12,
                    "text-font": [
                        "Open Sans Italic"
                    ],
                    'icon-image': 'building_pnt_hut',
                    "icon-anchor": 'right',
                    "text-anchor": 'left',
                    "text-justify": 'right'
                }} />
            <Layer id='huts-unclustered-point'
                type='circle'
                source='huts'
                filter={['!', ['has', 'point_count']]}
                paint={{
                    'circle-color': '#11b4da',
                    'circle-radius': 15,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff',
                }} />
            <Layer id='huts-unclustered-point-icon'
                type='symbol'
                source='huts'
                filter={['!', ['has', 'point_count']]}
                layout={{
                    "icon-image": 'building_pnt_hut'
                }} />
        </Source>
    }
} as OverlayDefinition
