import { Source } from "react-map-gl/maplibre";
import { Place } from "../search/places";
import { usePromise } from "../hooks/usePromise";
import React from "react";
import { Layer } from "react-map-gl";

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
                    h.lon,
                    h.lat
                ]
            },
            properties: {
                message: h.name,
                iconSize: [60, 60]
            }
        })),

    }

    return geojson
}

export default {
    id: 'huts',
    name: 'Huts',
    source: () => {
        const { result } = usePromise(fetchData, [])
        if (!result) return null
        return <Source key="huts" id="huts" type="geojson" data={result} cluster clusterMaxZoom={14}>
            <Layer id="clusters" type="circle" source="huts" filter={['has', 'point_count']} paint={{
                'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 750, '#f28cb1'],
                'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40]
            }} />
            <Layer id='cluster-count'
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
            <Layer id='unclustered-point'
                type='circle'
                source='huts'
                filter={['!', ['has', 'point_count']]}
                paint={{
                    'circle-color': '#11b4da',
                    'circle-radius': 10,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff',
                }} />
            <Layer id='unclustered-point-icon'
                type='symbol'
                source='huts'
                filter={['!', ['has', 'point_count']]}
                layout={{
                    "icon-image": 'building_pnt_hut'
                }}/>
        </Source>
    }
}
