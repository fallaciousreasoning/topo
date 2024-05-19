import * as React from 'react'
import { useMap } from 'react-map-gl'
import { findPlace } from '../search/nearest';
import { useRouteUpdater } from '../routing/router';
import round from '../utils/round';

const LONG_PRESS_THRESHOLD = 500;

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
            const update = {
                lla: closestPoint?.lat ?? lat,
                llo: closestPoint?.lon ?? lon,
                lab: closestPoint?.name ?? `Lat/Lon: ${round(lon)}, ${round(lat)}`
            }
            updateRoute(update)
            console.log(update)
        })

        return () => {
        }
    }, [map.current])
    return null
}
