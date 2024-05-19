import { Source } from "react-map-gl/maplibre";
import { Place } from "../search/places";
import { usePromise } from "../hooks/usePromise";
import React, { useEffect } from "react";
import { Layer, useMap } from "react-map-gl";
import { useRouteUpdater } from "../routing/router";

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
            }
        })),

    }

    return geojson
}

export default {
    id: 'huts',
    name: 'Huts',
    source: () => {
        const map = useMap()
        const { result } = usePromise(fetchData, [])
        const updateRoute = useRouteUpdater()

        useEffect(() => {
            const hutClickHandler = (e: mapboxgl.EventData) => {
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
            }

            map.current?.on('click', 'hut-unclustered-point', hutClickHandler)
            return () => {
                map.current?.off('click', 'hut-unclustered-point', hutClickHandler)
            }
        }, [])

        useEffect(() => {
            const zoomClickHandler = async (e: mapboxgl.EventData) => {
                const feature = e.features?.[0] as GeoJSON.Feature<GeoJSON.Point>;
                const clusterId = feature?.properties?.cluster_id;
                const hutsSource = map.current?.getSource('huts')
                if (!hutsSource || !clusterId) return

                const zoom = await (hutsSource as any).getClusterExpansionZoom(clusterId)
                map.current?.easeTo({
                    center: feature.geometry.coordinates as [number, number],
                    zoom,
                    duration: 500
                });
            }

            map.current?.on('click', 'hut-clusters', zoomClickHandler)
            return () => {
                map.current?.off('click', 'hut-clusters', zoomClickHandler)
            }
        }, [])
        if (!result) return null
        return <Source key="huts" id="huts" type="geojson" data={result} cluster clusterMaxZoom={14}>
            <Layer id="hut-clusters" type="circle" source="huts" filter={['has', 'point_count']} paint={{
                'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 750, '#f28cb1'],
                'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40]
            }} />
            <Layer id='hut-cluster-count'
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
            <Layer id='hut-unclustered-point'
                type='circle'
                source='huts'
                filter={['!', ['has', 'point_count']]}
                paint={{
                    'circle-color': '#11b4da',
                    'circle-radius': 15,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff',
                }} />
            <Layer id='hut-unclustered-point-icon'
                type='symbol'
                source='huts'
                filter={['!', ['has', 'point_count']]}
                layout={{
                    "icon-image": 'building_pnt_hut'
                }} />
        </Source>
    }
}
