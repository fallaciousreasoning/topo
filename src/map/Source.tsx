import { CanvasSourceSpecification, GeoJSONSourceSpecification, SourceSpecification } from "maplibre-gl";
import { useEffect } from "react";
import { useMap } from "./Map";

export default function Source({ id, spec }: { id: string, spec: SourceSpecification | CanvasSourceSpecification | GeoJSONSourceSpecification }) {
    const { map } = useMap()

    useEffect(() => {
        const addSource = () => {
            const cachableSource = 'tiles' in spec ? {
                ...spec,
                tiles: spec.tiles!.map(t => t.replace('https://', 'maybe-cache://') + `#${id}`)
            } : spec
            map.addSource(id, cachableSource)
        }
        if (map.loaded()) addSource()
        else map.on('load', addSource)

        return () => {
            map.removeSource(id)
        }
    }, [id])

    return null
}
