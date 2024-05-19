import { ViewStateChangeEvent, useMap } from "react-map-gl/maplibre"
import { useParams, useRouteUpdater } from "../routing/router"
import { useEffect } from "react"

const isDifferent = (a: number, b: number, slop = 0.0001) => Math.abs(a - b) > slop

export default function PositionSyncer() {
    const map = useMap()
    const params = useParams()
    const updateRoute = useRouteUpdater()

    useEffect(() => {
        const updatePosition = (e: ViewStateChangeEvent) => {
            updateRoute({
                lat: e.viewState.latitude,
                lon: e.viewState.longitude,
                zoom: e.viewState.zoom,
                rotation: e.viewState.bearing
            })
        }

        map.current?.on('moveend', updatePosition)
        return () => {
            map.current?.off('moveend', updatePosition)
        }
    }, [])

    useEffect(() => {
        const { lat, lng } = map.current!.getCenter()
        if (isDifferent(lat, params.lat) || isDifferent(lng, params.lon)) {
            map.current?.setCenter([params.lon, params.lat])
        }
    }, [params.lat, params.lon])

    useEffect(() => {
        if (isDifferent(map.current!.getZoom(), params.zoom, 0.1))
            map.current?.setZoom(params.zoom)
    }, [params.zoom])

    useEffect(() => {
        if (isDifferent(map.current!.getBearing(), params.rotation, 0.001))
            map.current?.setBearing(params.rotation)
    }, [params.rotation])

    return null
}
