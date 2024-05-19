import { useEffect } from "react"
import { useMap } from "react-map-gl"

export const useLayerHandler = (event: string, layer: string, handler: (e: mapboxgl.EventData) => void) => {
    const map = useMap()

    useEffect(() => {
        map.current?.on(event as any, layer, handler);
        return () => {
            map.current?.off(event as any, layer, handler)
        }
    }, [event, layer, handler])
}
