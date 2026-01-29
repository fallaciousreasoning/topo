import { useParams } from "../routing/router"
import React from "react"
import Source from "../map/Source"
import Layer from "../map/Layer"
import { useMap } from "../map/Map"

export default function () {
    const params = useParams()
    const { map } = useMap()

    const show = params.lla && params.llo && params.lab

    React.useEffect(() => {
        if (!map) return

        // Create a pin icon as SVG data URL
        const pinSvg = `
            <svg width="24" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C6.5 0 2 4.5 2 10c0 8 10 26 10 26s10-18 10-26c0-5.5-4.5-10-10-10z"
                      fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
                <circle cx="12" cy="10" r="4" fill="#ffffff"/>
            </svg>
        `
        const pinDataUrl = 'data:image/svg+xml;base64,' + btoa(pinSvg)

        if (!map.hasImage('pin-icon')) {
            const img = new Image(24, 36)
            img.onload = () => {
                if (!map.hasImage('pin-icon')) {
                    map.addImage('pin-icon', img)
                }
            }
            img.src = pinDataUrl
        }
    }, [map])

    if (!show) return null

    const geojson = {
        type: 'FeatureCollection' as const,
        features: [{
            type: 'Feature' as const,
            geometry: {
                type: 'Point' as const,
                coordinates: [params.llo!, params.lla!]
            },
            properties: {}
        }]
    }

    return (
        <>
            <Source id="map-label-pin" spec={{ type: 'geojson', data: geojson }} />
            <Layer layer={{
                id: 'map-label-pin',
                type: 'symbol',
                source: 'map-label-pin',
                layout: {
                    'icon-image': 'pin-icon',
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true
                }
            }} />
        </>
    )
}
