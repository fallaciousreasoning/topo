import { isPointInRing } from "../utils/distance";

const REGIONS_URL = '/data/regions.json'

let regionsPromise: Promise<GeoJSON.FeatureCollection> | null = null

const getRegions = (): Promise<GeoJSON.FeatureCollection> => {
    if (!regionsPromise) {
        regionsPromise = fetch(REGIONS_URL).then(r => r.json())
    }
    return regionsPromise
}

export interface Region {
    name: string
}

/**
 * The NZ Land District (see public/data/regions.json, scripts/update_regions.py)
 * whose boundary strictly contains (lat, lon), if any. These 12 districts
 * tile the entire country with no gaps, so this resolves for virtually any
 * point in NZ (unlike a locality/suburb, which only covers named
 * settlements) - but a whole land district is far too coarse a shape to be
 * useful as a search result, a long-press match, or a selected-shape
 * outline, so this is deliberately kept separate from
 * src/search/places.ts's getPlaces()/closestPlace machinery entirely. It's
 * a side lookup purely for annotating another place with the region it
 * falls within (see SearchSection.tsx, LocationSection.tsx).
 */
export const findContainingRegion = async (lat: number, lon: number): Promise<Region | undefined> => {
    const data = await getRegions()
    for (const feature of data.features) {
        const geometry = feature.geometry
        const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates
            : geometry.type === 'Polygon' ? [geometry.coordinates]
            : []
        if (polygons.some(([ring]) => isPointInRing(lat, lon, ring))) {
            return { name: feature.properties!.name }
        }
    }
    return undefined
}
