import type { FilterSpecification } from "maplibre-gl";

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
