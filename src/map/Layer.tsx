import { useEffect } from "react"
import { useMap } from "./Map"
import { AddLayerObject } from "maplibre-gl"

export default function Layer({ layer }: { layer: AddLayerObject }) {
    const { map } = useMap()
    useEffect(() => {
        let cancelled = false
        let added = false
        const addLayer = () => {
            if (cancelled) return
            added = true
            map.addLayer(layer)
        }
        if (map.loaded()) addLayer()

        // TODO: Idle probably isn't the ideal event for this
        else map.once('idle', addLayer)
        return () => {
            cancelled = true
            if (!map.getLayer(layer.id)) return
            map.removeLayer(layer.id)
        }
    }, [])
    return null
}
