import type { FilterSpecification } from "maplibre-gl";

const METERS_PER_PIXEL_AT_Z0_EQUATOR = 156543.03392
const REPRESENTATIVE_COS_LAT = Math.cos(43.5 * Math.PI / 180) // NZ features cluster around -42 to -44
const PIXELS_PER_KM_AT_Z0 = 1000 / (METERS_PER_PIXEL_AT_Z0_EQUATOR * REPRESENTATIVE_COS_LAT)

/**
 * An expression giving the on-screen pixel length of a real-world km distance
 * at any zoom - doubles every zoom level the same way MapLibre's own tiles do
 * ("constant real-world size" trick: exponential base-2 interpolation over
 * zoom, with each stop's output computed from the same underlying formula so
 * the relationship holds exactly, not just at the two chosen stops).
 *
 * MapLibre only allows a "zoom" expression as the direct top-level input to
 * interpolate/step, not buried under another operator - so any multiplier
 * needs to be baked into each stop's own output (via `multiplier`) rather
 * than wrapping the result of this function in something else.
 */
export function realWorldPixels(sizeKmExpression: unknown, multiplier = 1, zoomLow = 0, zoomHigh = 22) {
    const at = (zoom: number) => ['*', multiplier, ['*', sizeKmExpression, PIXELS_PER_KM_AT_Z0 * Math.pow(2, zoom)]]
    return ['interpolate', ['exponential', 2], ['zoom'], zoomLow, at(zoomLow), zoomHigh, at(zoomHigh)]
}

/**
 * A feature only appears once the map is zoomed in past a size-appropriate
 * threshold - a big feature (a long ridge, a large glacier) reveals itself at
 * low zoom, a small one only appears up close. sizeStops maps a size (in the
 * feature's own natural unit - km, for lengthKm/sizeKm properties) to the zoom
 * level at which features of about that size should start appearing. Must be
 * sorted by ascending size; minzoom values would usually descend as size grows.
 *
 * Features with no size property (e.g. point-only fallbacks with no natural
 * "size") always pass this filter - gate those with the layer's own minzoom
 * instead.
 */
export function sizeBasedVisibility(
    sizeProperty: string,
    sizeStops: [size: number, minzoom: number][],
): FilterSpecification {
    const interpolateArgs = sizeStops.flatMap(([size, minzoom]) => [size, minzoom]) as number[]
    const revealZoom = [
        'interpolate', ['linear'], ['get', sizeProperty],
        ...interpolateArgs,
    ]

    return ['any',
        ['!', ['has', sizeProperty]],
        ['>=', ['zoom'], revealZoom],
    ] as unknown as FilterSpecification
}
