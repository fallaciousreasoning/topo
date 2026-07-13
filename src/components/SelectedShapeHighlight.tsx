import * as React from "react"
import Source from "../map/Source"
import Layer from "../map/Layer"
import { useParams } from "../routing/router"
import { useMatchingSelectedShape } from "../utils/selectedShapeSignal"

/** Highlights the real line/polygon geometry of a selected search result (see
 * SearchSection.tsx) in red - a plain lat/lon pin doesn't convey a whole
 * lake or ridge's actual shape the way the outline itself does. Only shown
 * while the location page for that exact selection is still open - if the
 * URL has since moved to a different coordinate (a new search, clicking a
 * hut, ...) the stale shape no longer matches and stops rendering. */
export default function SelectedShapeHighlight() {
    const params = useParams()

    const isLocationPage = params.page?.startsWith('location/')
    const locationMatch = isLocationPage ? params.page?.match(/^location\/([-\d.]+)\/([-\d.]+)/) : null
    const lat = locationMatch ? parseFloat(locationMatch[1]) : null
    const lon = locationMatch ? parseFloat(locationMatch[2]) : null

    const geometry = useMatchingSelectedShape(lat, lon)
    if (!geometry) return null

    const data: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry, properties: {} }],
    }

    return (
        <Source id="selected-shape-highlight" spec={{ type: 'geojson', data }}>
            <Layer layer={{
                id: 'selected-shape-highlight-fill',
                type: 'fill',
                source: 'selected-shape-highlight',
                filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
                paint: {
                    'fill-color': '#ff0000',
                    'fill-opacity': 0.1,
                }
            }} />
            <Layer layer={{
                id: 'selected-shape-highlight-line',
                type: 'line',
                source: 'selected-shape-highlight',
                paint: {
                    'line-color': '#ff0000',
                    'line-width': 2,
                }
            }} />
        </Source>
    )
}
