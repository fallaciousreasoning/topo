import * as React from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { findPlace } from '../search/nearest';
import { useRouteUpdater } from '../routing/router';
import round from '../utils/round';
import { demSource, elevationScheme, getElevation } from '../layers/contours';
const LONG_PRESS_THRESHOLD = 500;

window['demSource'] = demSource.manager

export default function LongPressLookup() {
    const map = useMap()
    const updateRoute = useRouteUpdater()

    React.useEffect(() => {
        if (!map.current) return

        let mouseDownAt: number = 0
        map.current.on('mousedown', e => {
            mouseDownAt = Date.now()
        })
        map.current?.on('click', async e => {
            const elapsed = Date.now() - mouseDownAt
            if (elapsed < LONG_PRESS_THRESHOLD) return

            const lat = e.lngLat.lat
            const lon = e.lngLat.lng

            const closestPoint = await findPlace(lat, lon)

            const elevation = round(await getElevation([lat, lon]), 0)

            const update = {
                lla: parseFloat(closestPoint?.lat ?? '') || lat,
                llo: parseFloat(closestPoint?.lon ?? '') || lon,
                lab: (closestPoint?.name ?? `Lat/Lon: ${round(lon)}, ${round(lat)}`) + ` (${elevation}m)`
            }


            updateRoute(update)
            console.log(update)
        })

        return () => {
        }
    }, [map.current])
    return null
}
