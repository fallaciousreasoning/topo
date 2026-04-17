import React, { useEffect } from "react";
import { useLayerHandler } from "../hooks/useLayerClickHandler";
import { usePromise } from "../hooks/usePromise";
import { useRouteUpdater } from "../routing/router";
import { OverlayDefinition } from "./config";
import Source from "../map/Source";
import Layer from "../map/Layer";
import { useMap } from "../map/Map";

export interface HuntingBlock {
    name: string;
    permitArea?: string;
    blockId?: string;
    blockType?: string;
    status?: string;
    ha?: number;
    docUrl?: string;
    introduction?: string;
    about?: string;
    access?: string;
    dogs?: string;
    noHuntingZones?: string;
}

let huntingPromise: Promise<GeoJSON.FeatureCollection> | null = null;

export const getHunting = (): Promise<GeoJSON.FeatureCollection> => {
    if (!huntingPromise) {
        huntingPromise = fetch('/data/hunting.json').then(r => r.json())
    }
    return huntingPromise
}

export const getHuntingBlockByName = async (name: string): Promise<HuntingBlock | null> => {
    const data = await getHunting()
    const feature = data.features.find(f => f.properties?.name === name)
    return (feature?.properties as HuntingBlock) ?? null
}

export default {
    id: 'hunting',
    name: 'Hunting Areas',
    description: 'DOC Recreational Hunting Permit Areas',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result } = usePromise(getHunting, [])
        const updateRoute = useRouteUpdater()
        const { map } = useMap()

        const handleClick = (e: any) => {
            const feature = e.features?.[0]
            if (!feature) return
            const name = feature.properties?.name
            if (!name) return
            updateRoute({
                page: `location/${e.lngLat.lat}/${e.lngLat.lng}/${encodeURIComponent(name)}`
            })
        }

        useLayerHandler('click', 'hunting-fill', handleClick)
        useLayerHandler('click', 'hunting-nohunt-fill', handleClick)

        useEffect(() => {
            const setCursor = () => { map.getCanvas().style.cursor = 'pointer' }
            const clearCursor = () => { map.getCanvas().style.cursor = '' }
            map.on('mouseenter', 'hunting-fill', setCursor)
            map.on('mouseleave', 'hunting-fill', clearCursor)
            map.on('mouseenter', 'hunting-nohunt-fill', setCursor)
            map.on('mouseleave', 'hunting-nohunt-fill', clearCursor)
            return () => {
                map.off('mouseenter', 'hunting-fill', setCursor)
                map.off('mouseleave', 'hunting-fill', clearCursor)
                map.off('mouseenter', 'hunting-nohunt-fill', setCursor)
                map.off('mouseleave', 'hunting-nohunt-fill', clearCursor)
            }
        }, [map])

        if (!result) return null

        return (
            <Source id="hunting" spec={{ type: 'geojson', data: result }}>
                {/* Regular hunting areas */}
                <Layer layer={{
                    id: 'hunting-fill',
                    type: 'fill',
                    source: 'hunting',
                    filter: ['!', ['has', 'noHuntingZones']],
                    paint: {
                        'fill-color': '#16a34a',
                        'fill-opacity': 0.15,
                    }
                }} />
                <Layer layer={{
                    id: 'hunting-outline',
                    type: 'line',
                    source: 'hunting',
                    filter: ['!', ['has', 'noHuntingZones']],
                    paint: {
                        'line-color': '#15803d',
                        'line-width': 1.5,
                        'line-opacity': 0.9,
                    }
                }} />
                {/* No-hunting zones — rendered on top in red */}
                <Layer layer={{
                    id: 'hunting-nohunt-fill',
                    type: 'fill',
                    source: 'hunting',
                    filter: ['has', 'noHuntingZones'],
                    paint: {
                        'fill-color': '#dc2626',
                        'fill-opacity': 0.2,
                    }
                }} />
                <Layer layer={{
                    id: 'hunting-nohunt-outline',
                    type: 'line',
                    source: 'hunting',
                    filter: ['has', 'noHuntingZones'],
                    paint: {
                        'line-color': '#dc2626',
                        'line-width': 1.5,
                        'line-opacity': 0.8,
                    }
                }} />
            </Source>
        )
    }
} as OverlayDefinition
