import { useMap } from "../map/Map"
import { RouteParams, useParams, useRouteUpdater } from "../routing/router"
import { useEffect, useMemo } from "react"
import { throttle } from "../utils/throttle"
import { MapLibreEvent } from 'maplibre-gl'

const isDifferent = (a: number, b: number, slop = 0.0001) => Math.abs(a - b) > slop

export default function PositionSyncer() {
    const { map } = useMap()
    const params = useParams()
    const updateRoute = useRouteUpdater()

    useEffect(() => {
        const updatePosition = (e: MapLibreEvent<MouseEvent>) => {
            const map = e.target
            const { lng, lat } = map.getCenter()
            updateRoute({
                lat: lat,
                lon: lng,
                zoom: map.getZoom(),
                rotation: map.getBearing(),
                pitch: map.getPitch()
            })
        }

        map.on('moveend', updatePosition)
        return () => {
            map.off('moveend', updatePosition)
        }
    }, [])

    const updateMapPosition = useMemo(() => throttle((params: RouteParams) => {
        const { lat, lng } = map.getCenter()
        if (isDifferent(lat, params.lat) || isDifferent(lng, params.lon)) {
            map.setCenter([params.lon, params.lat])
        }

        if (isDifferent(map.getZoom(), params.zoom, 0.1))
            map.setZoom(params.zoom)


        if (isDifferent(map.getBearing(), params.rotation, 0.001))
            map.setBearing(params.rotation)

        if (isDifferent(map.getPitch(), params.pitch, 0.001))
            map.setPitch(params.pitch)
    }, 500), [map])

    useEffect(() => updateMapPosition(params), [params.lat, params.lon, params.zoom, params.rotation, params.pitch, updateMapPosition])

    return null
}
