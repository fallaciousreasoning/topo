import { CanvasSourceSpecification, GeoJSONSource, GeoJSONSourceSpecification, SourceSpecification, VectorSourceSpecification } from "maplibre-gl";
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
            if (!map.getSource(id)) map.addSource(id, cachableSource)
            setLoaded(true)
        }
        addSource()

        return () => {
            if (map.getSource(id)) {
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

    useEffect(() => {
        if (!('data' in spec)) return

        const source = map.getSource(id) as GeoJSONSource
        source.setData(spec.data)
    }, [spec['data']])

    return loaded ? children : null
}
