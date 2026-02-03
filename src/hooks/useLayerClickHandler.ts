import { useEffect } from "react"
import { useMap } from "../map/Map"
import { MapLayerMouseEvent } from "maplibre-gl"

export const useLayerHandler = (event: string, layer: string, handler: (e: MapLayerMouseEvent) => void) => {
    const { map } = useMap()

    useEffect(() => {
        map.on(event as any, layer, handler);
        return () => {
            map.off(event as any, layer, handler)
        }
    }, [event, layer, handler])
}
