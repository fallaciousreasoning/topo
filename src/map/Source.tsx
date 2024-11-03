import { CanvasSourceSpecification, GeoJSONSourceSpecification, SourceSpecification, VectorSourceSpecification } from "maplibre-gl";
import { useEffect } from "react";
import { useMap } from "./Map";
import React from "react";

export default function Source({ id, spec, children }: React.PropsWithChildren<{ id: string, spec: SourceSpecification | VectorSourceSpecification | CanvasSourceSpecification | GeoJSONSourceSpecification }>) {
    const { map } = useMap()
    const [loaded, setLoaded] = React.useState(false)

    useEffect(() => {
        let cancelled = false
        const addSource = () => {
            if (cancelled) return

            const cachableSource = 'tiles' in spec ? {
                ...spec,
                tiles: spec.tiles!.map(t => t.replace('https://', 'maybe-cache://') + `#${id}`)
            } : spec
            map.addSource(id, cachableSource)
            setLoaded(true)
        }
        if (map.loaded()) addSource()
        else map.on('load', addSource)

        return () => {
            if (map.style && map.style._loaded && map.getSource(id)) {
                // Parent effects are destroyed before child ones, see
                // https://github.com/facebook/react/issues/16728
                // Source can only be removed after all child layers are removed
                const allLayers = map.getStyle()?.layers;
                if (allLayers) {
                    for (const layer of allLayers) {
                        // @ts-ignore (2339) source does not exist on all layer types
                        if (layer.source === id) {
                            map.removeLayer(layer.id);
                        }
                    }
                }
                map.removeSource(id);
            }
        }
    }, [id])

    return loaded ? children : null
}
