import { useEffect } from "react"
import { useMap } from "../map/Map"

/**
 * Hides the given LINZ base-map style layer ids for as long as the calling
 * overlay is mounted (i.e. toggled on), restoring them when it unmounts.
 *
 * Used when an overlay renders its own version of something the base map
 * already labels by itself (e.g. river names via linzVector.ts's
 * All-Waterway-River-Names layer) - both showing at once means every matching
 * name is doubled up. This just flips a layout-visibility flag on the base
 * map's own style layer, so it works the same regardless of whether the
 * underlying tiles came from LINZ's live server or a locally cached bundle -
 * unlike stripping the name out of the tile data itself, which only affects
 * whichever tile source is actually in use.
 *
 * `layerIds` should be a stable (module-level) array - it's not treated as a
 * dependency, just read once per mount/map change.
 *
 * Re-applies on every 'styledata' event, since switching base maps re-adds
 * every layer from scratch (see TopoMap.tsx's Layers()), which would
 * otherwise reset visibility back to whatever the style itself defines.
 * Layer ids that don't exist on the current base map (a non-LINZ-vector one,
 * e.g. topo-raster) are silently skipped.
 */
export function useHideBaseMapLayers(layerIds: string[]) {
    const { map } = useMap()

    useEffect(() => {
        const hide = () => {
            for (const id of layerIds) {
                if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none')
            }
        }

        hide()
        map.on('styledata', hide)

        return () => {
            map.off('styledata', hide)
            for (const id of layerIds) {
                if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible')
            }
        }
    }, [map])
}
