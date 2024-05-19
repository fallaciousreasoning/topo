import { Popup, useMap } from "react-map-gl/maplibre"
import { useParams, useRouteUpdater } from "../routing/router"
import React, { useEffect } from "react"

export default function () {
    const params = useParams()
    const updateRoute = useRouteUpdater()

    const show = params.lla && params.llo && params.lab
    if (!show) return null
    return <Popup key={params.lab! + params.lla! + params.llo!} latitude={params.lla!} longitude={params.llo!} anchor="bottom" onClose={() => {
        updateRoute({
            lla: null,
            llo: null,
            lab: null
        })
    }}>
        {params.lab}
    </Popup>
}
