import { useEffect } from "react"
import { useMap } from "./Map"
import { AddLayerObject } from "maplibre-gl"

export default function Layer({ layer }: { layer: AddLayerObject }) {
    const { map } = useMap()
    useEffect(() => {
        if (map.loaded()) map.addLayer(layer)
        else map.on('load', () => map.addLayer(layer))
        return () => {
            map.removeLayer(layer.id)
        }
    }, [])
    return null
}
