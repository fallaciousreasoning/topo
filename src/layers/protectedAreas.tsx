import * as React from "react";
import type { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { usePromise } from "../hooks/usePromise";
import { sizeBasedVisibility } from "./labelSizing";
import { useLayerHandler } from "../hooks/useLayerClickHandler";
import { useRouteUpdater } from "../routing/router";
import { useMap } from "../map/Map";

const PROTECTED_AREAS_URL = '/data/protectedAreas.json'

// This dataset is dense (5000+ named reserves, parks and historic sites) - held
// back further than the other new overlays so it doesn't overwhelm the view.
const PROTECTED_AREAS_MINZOOM = 11

const POLYGON_SIZE_STOPS: [number, number][] = [
    [1, 13],
    [5, 12],
    [15, 11],
]

let protectedAreasPromise: Promise<GeoJSON.FeatureCollection> | null = null

const getProtectedAreas = (): Promise<GeoJSON.FeatureCollection> => {
    if (!protectedAreasPromise) {
        protectedAreasPromise = fetch(PROTECTED_AREAS_URL).then(r => r.json())
    }
    return protectedAreasPromise
}

const textPaint = {
    'text-color': '#2d6a2d',
    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
    'text-halo-width': 1.2,
} as const

// Only "historic site" has a matching LINZ Topo50 sprite icon - the OSM-derived
// "reserve" bucket (most of this dataset) has no reliable subtype to icon by,
// and the other gazetteer-only subtypes have no equivalent symbol.
const ICON_POINT_TYPES: [string, ...string[]] = ['historic site']

export default {
    id: 'protectedAreas',
    name: 'Reserve & Park Names',
    description: 'Named reserves, parks, forests and historic sites, from OpenStreetMap and the NZGB Gazetteer',
    type: 'overlay',
    cacheable: false,
    source: () => {
        const { result: data } = usePromise(getProtectedAreas, [])
        const updateRoute = useRouteUpdater()
        const { map } = useMap()

        useLayerHandler('click', 'protected-areas-fill-polygon', e => {
            const feature = e.features?.[0]
            const name = feature?.properties?.name
            if (!name) return
            updateRoute({
                page: `location/${e.lngLat.lat}/${e.lngLat.lng}/${encodeURIComponent(name)}`
            })
        })
        useLayerHandler('mouseenter', 'protected-areas-fill-polygon', () => {
            map.getCanvas().style.cursor = 'pointer'
        })
        useLayerHandler('mouseleave', 'protected-areas-fill-polygon', () => {
            map.getCanvas().style.cursor = ''
        })

        // Not every protected area has OSM polygon geometry backing it (some are
        // gazetteer-only, rendered as a plain point) - those never hit the
        // fill-polygon layer above, so they need their own click handling.
        const handlePointClick = (e: any) => {
            const feature = e.features?.[0]
            const name = feature?.properties?.name
            if (!name || feature.geometry.type !== 'Point') return
            const [lng, lat] = feature.geometry.coordinates
            updateRoute({
                page: `location/${lat}/${lng}/${encodeURIComponent(name)}`
            })
        }
        useLayerHandler('click', 'protected-areas-label-point', handlePointClick)
        useLayerHandler('click', 'protected-areas-label-point-icon', handlePointClick)
        useLayerHandler('mouseenter', 'protected-areas-label-point', () => {
            map.getCanvas().style.cursor = 'pointer'
        })
        useLayerHandler('mouseleave', 'protected-areas-label-point', () => {
            map.getCanvas().style.cursor = ''
        })
        useLayerHandler('mouseenter', 'protected-areas-label-point-icon', () => {
            map.getCanvas().style.cursor = 'pointer'
        })
        useLayerHandler('mouseleave', 'protected-areas-label-point-icon', () => {
            map.getCanvas().style.cursor = ''
        })

        if (!data) return null

        return <Source id='protectedAreas' spec={{
            type: 'geojson',
            data,
        }}>
            {/* Kept invisible (rather than removed) so a reserve/park stays
                clickable (see the useLayerHandler above) and single-clicking
                one still opens its location page - the fill itself is
                redundant permanent clutter, since the base map already shows
                these areas and a selected one's shape is drawn (in red) via
                SelectedShapeHighlight once you've actually navigated to it
                (see LocationSection.tsx/setSelectedShape). */}
            <Layer layer={{
                id: 'protected-areas-fill-polygon',
                type: 'fill',
                source: 'protectedAreas',
                minzoom: PROTECTED_AREAS_MINZOOM,
                filter: ['==', ['geometry-type'], 'Polygon'],
                paint: {
                    'fill-color': '#2d6a2d',
                    'fill-opacity': 0,
                }
            }} />
            <Layer layer={{
                id: 'protected-areas-outline-polygon',
                type: 'line',
                source: 'protectedAreas',
                minzoom: PROTECTED_AREAS_MINZOOM,
                filter: ['==', ['geometry-type'], 'Polygon'],
                paint: {
                    'line-color': '#2d6a2d',
                    'line-width': 1,
                    'line-opacity': 0.5,
                    'line-dasharray': [2, 2],
                }
            }} />
            <Layer layer={{
                id: 'protected-areas-label-polygon',
                type: 'symbol',
                source: 'protectedAreas',
                minzoom: PROTECTED_AREAS_MINZOOM,
                filter: ['all',
                    ['==', ['geometry-type'], 'Polygon'],
                    sizeBasedVisibility('sizeKm', POLYGON_SIZE_STOPS),
                ],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        11, 12,
                        15, 18,
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.06,
                },
                paint: textPaint,
            }} />
            <Layer layer={{
                id: 'protected-areas-label-point',
                type: 'symbol',
                source: 'protectedAreas',
                minzoom: PROTECTED_AREAS_MINZOOM,
                filter: ['all',
                    ['==', ['geometry-type'], 'Point'],
                    ['!', ['in', ['get', 'type'], ['literal', ICON_POINT_TYPES]]],
                ],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        11, 10,
                        15, 14,
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.06,
                },
                paint: textPaint,
            }} />
            <Layer layer={{
                id: 'protected-areas-label-point-icon',
                type: 'symbol',
                source: 'protectedAreas',
                minzoom: PROTECTED_AREAS_MINZOOM,
                filter: ['all',
                    ['==', ['geometry-type'], 'Point'],
                    ['in', ['get', 'type'], ['literal', ICON_POINT_TYPES]],
                ],
                layout: {
                    'icon-image': 'historic_site_pnt',
                    'icon-size': 1.2,
                    'icon-anchor': 'bottom',
                    'text-field': ['get', 'name'],
                    'text-anchor': 'center',
                    'text-offset': [0, 0.6],
                    'text-size': ['interpolate', ['linear'], ['zoom'],
                        11, 10,
                        15, 14,
                    ],
                    'text-font': ['Open Sans Italic'],
                    'text-letter-spacing': 0.06,
                },
                paint: textPaint,
            }} />
        </Source>
    }
} as OverlayDefinition
