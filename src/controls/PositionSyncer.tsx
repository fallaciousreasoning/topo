import { ViewStateChangeEvent, useMap } from "react-map-gl/maplibre"
import { RouteParams, useParams, useRouteUpdater } from "../routing/router"
import { useEffect, useMemo } from "react"
import { throttle } from "../utils/throttle"

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
                rotation: e.viewState.bearing,
                pitch: e.viewState.pitch
            })
        }

        map.current?.on('moveend', updatePosition)
        return () => {
            map.current?.off('moveend', updatePosition)
        }
    }, [])

    const updateMapPosition = useMemo(() => throttle((params: RouteParams) => {
        if (!map.current) return;

        const { lat, lng } = map.current.getCenter()
        if (isDifferent(lat, params.lat) || isDifferent(lng, params.lon)) {
            map.current?.setCenter([params.lon, params.lat])
        }

        if (isDifferent(map.current.getZoom(), params.zoom, 0.1))
            map.current?.setZoom(params.zoom)


        if (isDifferent(map.current!.getBearing(), params.rotation, 0.001))
            map.current?.setBearing(params.rotation)

        if (isDifferent(map.current.getPitch(), params.pitch, 0.001))
            map.current.setPitch(params.pitch)
    }, 500), [map])

    useEffect(() => updateMapPosition(params), [params.lat, params.lon, params.zoom, params.rotation, params.pitch, updateMapPosition])

    return null
}
