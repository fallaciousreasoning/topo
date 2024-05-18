import { Marker, Popup, useMap } from "react-map-gl/maplibre"
import { useParams, useRouteUpdater } from "../routing/router"
import React, { useEffect } from "react"

export default function () {
    const params = useParams()
    const updateRoute = useRouteUpdater()
    const map = useMap()

    const show = params.lat && params.lon && params.lab
    useEffect(() => {
        if (!show) return

        map.current?.flyTo({
            animate: true,
            center: [params.llo!, params.lla!],
        })
    }, [params.lla, params.llo, params.llo])

    if (!show) return null
    return <Popup latitude={params.lla!} longitude={params.llo!} anchor="bottom" onClose={() => {
        updateRoute({
            lla: null,
            llo: null,
            lab: null
        })
    }}>
        {params.lab}
    </Popup>
}
