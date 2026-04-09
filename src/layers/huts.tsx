import React, { useEffect } from "react";
import Supercluster from "supercluster";
import { useLayerHandler } from "../hooks/useLayerClickHandler";
import { usePromise } from "../hooks/usePromise";
import { useRouteUpdater } from "../routing/router";
import { OverlayDefinition } from "./config";
import Source from "../map/Source";
import Layer from "../map/Layer";
import { useMap } from "../map/Map";

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
        features: huts.map(h => {
            const geometry = {
                type: 'Point' as const,
                coordinates: [parseFloat(h.lon as any), parseFloat(h.lat as any)]
            }
            return {
                type: 'Feature' as const,
                geometry,
                properties: { message: h.name, geometry }
            }
        })
    }
    return geojson
}

const cluster = new Supercluster({ maxZoom: 11, reduce: () => {} })

export default {
    id: 'huts',
    name: 'Huts',
    description: 'NZ Backcountry Huts',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result } = usePromise(getHutsGeoJson, [])
        const { map } = useMap()
        const updateRoute = useRouteUpdater()

        useEffect(() => {
            if (!result) return
            cluster.load(result.features as any)
            const updateCluster = () => {
                const zoom = Math.floor(map.getZoom())
                const clusters = cluster.getClusters([-180, -85, 180, 85], zoom);
                (map.getSource('huts') as any)?.setData({
                    type: 'FeatureCollection',
                    features: clusters.map(m => {
                        if (!m.id) return m
                        return { ...m, geometry: m.properties.geometry }
                    })
                })
            }
            updateCluster()
            map.on('zoom', updateCluster)
            return () => { map.off('zoom', updateCluster) }
        }, [result])

        useLayerHandler('click', 'huts-point', e => {
            const hutFeature = e.features?.[0]
            if (!hutFeature) return
            const hutName = hutFeature.properties?.message
            if (!hutName) return
            const point = hutFeature.geometry as GeoJSON.Point
            updateRoute({
                page: `location/${point.coordinates[1]}/${point.coordinates[0]}/${encodeURIComponent(hutName)}`
            })
        })

        if (!result) return null
        return <Source id="huts" spec={{ type: 'geojson', data: { type: 'FeatureCollection', features: [] } }}>
            <Layer layer={{
                id: 'huts-point',
                type: 'circle',
                source: 'huts',
                paint: { 'circle-color': 'transparent', 'circle-radius': 15 }
            }} />
            <Layer layer={{
                id: 'huts-point-icon',
                type: 'symbol',
                source: 'huts',
                layout: { 'icon-image': 'building_pnt_hut' }
            }} />
        </Source>
    }
} as OverlayDefinition
