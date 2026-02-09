import React from "react";
import { useClusterHandlers } from "../hooks/useClusterHandlers";
import { useLayerHandler } from "../hooks/useLayerClickHandler";
import { usePromise } from "../hooks/usePromise";
import { useRouteUpdater } from "../routing/router";
import { Place } from "../search/places";
import { OverlayDefinition } from "./config";
import Source from "../map/Source";
import Layer from "../map/Layer";

export interface HutGalleryImage {
    url: string;
    caption?: string;
}

export interface Hut {
    assetId: number;
    name: string;
    status: string;
    region?: string;
    lat: number;
    lon: number;
    bookable?: boolean;
    facilities?: string[];
    numberOfBunks?: number;
    hutCategory?: string;
    proximityToRoadEnd?: string;
    introduction?: string;
    introductionThumbnail?: string;
    heroImage?: string;
    webcamUrl?: string;
    webcamUrls?: string[];
    gallery?: HutGalleryImage[];
    staticLink?: string;
    place?: string;
    type?: string;
}

let hutsPromise: Promise<Hut[]>
export const getHuts = () => {
    if (!hutsPromise) {
        hutsPromise = fetch('/data/huts.json').then(r => r.json() as Promise<Hut[]>)
            .then(data => {
                for (const hut of data) {
                    hut.type = 'hut'
                }
                return data
            })
    }
    return hutsPromise
}

export const getHutByName = async (name: string): Promise<Hut | null> => {
    const huts = await getHuts()
    return huts.find(h => h.name === name) ?? null
}

const getHutsGeoJson = async () => {
    const huts = await getHuts()
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
        const { result } = usePromise(getHutsGeoJson, [])
        const updateRoute = useRouteUpdater()

        useLayerHandler('click', 'huts-unclustered-point', e => {
            const hutFeature = e.features?.[0]
            if (!hutFeature) return

            const hutName = hutFeature.properties?.message
            if (!hutName) return

            const point = hutFeature.geometry as GeoJSON.Point

            updateRoute({
                page: `location/${point.coordinates[1]}/${point.coordinates[0]}/${encodeURIComponent(hutName)}`
            })
        })

        useClusterHandlers('huts')

        if (!result) return null
        return <Source id="huts" spec={{
            type: 'geojson',
            data: result,
            cluster: true,
            clusterMaxZoom: 14
        }}>
            <Layer layer={{
                id: "huts-clusters", type: "circle", source: "huts", filter: ['has', 'point_count'], paint: {
                    'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 750, '#f28cb1'],
                    'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40]
                }
            }} />
            <Layer layer={{
                id: 'huts-cluster-count',
                type: 'symbol',
                source: 'huts',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-size': 12,
                    "text-font": [
                        "Open Sans Italic"
                    ],
                    'icon-image': 'building_pnt_hut',
                    "icon-anchor": 'right',
                    "text-anchor": 'left',
                    "text-justify": 'right'
                }
            }} />
            <Layer layer={{
                id: 'huts-unclustered-point',
                type: 'circle',
                source: 'huts',
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-color': 'transparent',
                    'circle-radius': 15,
                }
            }} />
            <Layer layer={{
                id: 'huts-unclustered-point-icon',
                type: 'symbol',
                source: 'huts',
                filter: ['!', ['has', 'point_count']],
                layout: {
                    "icon-image": 'building_pnt_hut'
                }
            }} />
        </Source>
    }
} as OverlayDefinition
