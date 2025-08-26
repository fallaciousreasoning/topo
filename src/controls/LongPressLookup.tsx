import * as React from 'react'
import { findPlace } from '../search/nearest';
import { useRouteUpdater } from '../routing/router';
import round from '../utils/round';
import { getElevation } from '../layers/contours';
import { demSource } from '../layers/demSource';
import { useMap } from '../map/Map';
import { MapMouseEvent } from 'maplibre-gl';
const LONG_PRESS_THRESHOLD = 500;

window['demSource'] = demSource.manager

export default function LongPressLookup() {
    const { map } = useMap()
    const updateRoute = useRouteUpdater()

    React.useEffect(() => {
        let mouseDownAt: number = 0
        const downHandler = () => {
            mouseDownAt = Date.now()
        }

        const clickHandler = async (e: MapMouseEvent) => {
            const elapsed = Date.now() - mouseDownAt
            if (elapsed < LONG_PRESS_THRESHOLD) return

            const lat = e.lngLat.lat
            const lon = e.lngLat.lng

            const closestPoint = await findPlace(lat, lon)

            const elevation = round(await getElevation([lat, lon], map.getZoom()), 0)

            const update = {
                lla: parseFloat(closestPoint?.lat ?? '') || lat,
                llo: parseFloat(closestPoint?.lon ?? '') || lon,
                lab: (closestPoint?.name ?? `Lat/Lon: ${round(lon)}, ${round(lat)}`) + ` (${elevation}m)`
            }

            updateRoute(update)
        }

        map.on('mousedown', downHandler)
        map.on('click', clickHandler)

        return () => {
            map.off('mousedown', downHandler)
            map.off('click', clickHandler)
        }
    }, [])
    return null
}
