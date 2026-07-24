import { getHuts } from "../layers/huts";
import { getMountains } from "../layers/mountains";
import { getDistance, getLineMidpoint } from "../utils/distance";

const placesUrl = 'https://search.topos.nz/data/min_excluded_places.json'

export interface Place {
    name: string,
    lat: string,
    lon: string,
    type: string,
    /** [west, south, east, north] - present when the place has real line/polygon
     * geometry (not just a point), so selecting it can fit the map to its
     * actual extent instead of just flying to a single coordinate. */
    bbox?: [number, number, number, number],
    /** Real line/polygon geometry, when available - lets closestPlace (see
     * src/search/nearest.ts) measure distance to the actual shape (0 if
     * inside a polygon) rather than only ever to lat/lon, which is just a
     * bbox centre for these and can be well outside the real shape for an
     * irregular one. */
    geometry?: GeoJSON.Geometry,
}

/** Bounding box of any GeoJSON geometry - a degenerate (zero-area) box for a Point. */
const bboxOf = (geometry: GeoJSON.Geometry): [number, number, number, number] => {
    const coords: [number, number][] =
        geometry.type === 'Point' ? [geometry.coordinates as [number, number]] :
        geometry.type === 'LineString' ? geometry.coordinates as [number, number][] :
        geometry.type === 'Polygon' ? (geometry.coordinates as [number, number][][])[0] :
        geometry.type === 'MultiPolygon' ? (geometry.coordinates as [number, number][][][]).flat(2) :
        []

    const lons = coords.map(c => c[0])
    const lats = coords.map(c => c[1])
    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
}

/** Whether a place's bbox is a real extent (line/polygon), not just a
 * degenerate point-sized box. */
export const hasRealShape = (place: Place) => {
    if (!place.bbox) return false
    const [west, south, east, north] = place.bbox
    return west !== east || south !== north
}

const DUPLICATE_RADIUS_KM = 5

/**
 * The same real-world feature (a lake, a reserve, ...) often appears twice -
 * once as a plain point from the remote gazetteer index (placesUrl), and
 * once with real polygon/line geometry from a local overlay dataset (see
 * placesFromGeoJson) - or, now that placesFromGeoJson also feeds
 * OSM-sourced point-only data (localities.json), twice as a plain point from
 * two different sources with no shape at all (e.g. "Lismore" from both
 * placesUrl and OSM). Left alone, both show up as identically-named search
 * results, and picking the wrong one silently loses the "zoom to fit"
 * behaviour in SearchSection.tsx (it has no bbox to fit to). Collapse
 * same-named, nearby places down to whichever has real shape data - or, if
 * none of them do, down to just the first one.
 *
 * Grouping by exact name first (cheap, via a Map) keeps this to a handful of
 * comparisons per name rather than comparing all ~70k places pairwise - two
 * different real-world features sharing an exact name (e.g. two distinct
 * "Black Peak"s) are common, so proximity still needs to be checked within
 * each name group rather than just collapsing every match.
 */
const dedupeByShape = (places: Place[]): Place[] => {
    const byName = new Map<string, Place[]>()
    for (const place of places) {
        const group = byName.get(place.name)
        if (group) group.push(place)
        else byName.set(place.name, [place])
    }

    const result: Place[] = []
    for (const group of byName.values()) {
        if (group.length === 1) {
            result.push(...group)
            continue
        }
        const shaped = group.filter(hasRealShape)
        result.push(...shaped)

        const unshaped = group.filter(place => {
            if (hasRealShape(place)) return false
            return !shaped.some(s => getDistance(
                parseFloat(place.lat), parseFloat(place.lon),
                parseFloat(s.lat), parseFloat(s.lon),
            ) < DUPLICATE_RADIUS_KM)
        })
        // None of these have shape data to prefer between - same
        // nearby-and-same-name collapse as above, just against each other
        // instead of against `shaped`, keeping whichever was encountered first.
        const keptUnshaped: Place[] = []
        for (const place of unshaped) {
            const isDuplicate = keptUnshaped.some(k => getDistance(
                parseFloat(place.lat), parseFloat(place.lon),
                parseFloat(k.lat), parseFloat(k.lon),
            ) < DUPLICATE_RADIUS_KM)
            if (!isDuplicate) keptUnshaped.push(place)
        }
        result.push(...keptUnshaped)
    }
    return result
}

/** Loads a local named-feature GeoJSON overlay dataset as search Places, using
 * each feature's real geometry for its bbox rather than treating it as a bare
 * point - so e.g. selecting "Fiordland National Park" or "Lake Taupō" fits the
 * map to its actual shape instead of just recentring on a coordinate. */
const placesFromGeoJson = (url: string, filter: (f: GeoJSON.Feature) => boolean = () => true) => async (): Promise<Place[]> => {
    const data: GeoJSON.FeatureCollection = await fetch(url).then(r => r.json())
    return data.features
        .filter(f => f.properties?.name && filter(f))
        .map(f => {
            const [west, south, east, north] = bboxOf(f.geometry)
            // A bbox centre can land well off a bent/hooked line (a ridge
            // doubling back on itself, say) - use the point actually halfway
            // along the line's length instead, so the pin sits on the line.
            const [lon, lat] = f.geometry.type === 'LineString'
                ? getLineMidpoint(f.geometry.coordinates as [number, number][])
                : [(west + east) / 2, (south + north) / 2]
            return {
                name: f.properties!.name,
                lat: lat.toString(),
                lon: lon.toString(),
                type: f.properties!.type ?? 'place',
                bbox: [west, south, east, north],
                geometry: f.geometry,
            }
        })
}

let placesPromise: Promise<Place[]>;

const makePlacesPromise = async (sources: (() => Promise<Place[]>)[]) => {
    return Promise.all(sources.map(s => s())).then(r => dedupeByShape(r.flat()))
}

export const getPlaces = () => {
    if (!placesPromise) {
        placesPromise = makePlacesPromise([
            () => getHuts(),
            () => getMountains()
                .then(r => Object.entries(r)
                    .filter(([, m]) => m.latlng?.length && m.name)
                    .map(([url, m]) => ({
                        name: m.name,
                        lat: m.latlng![0],
                        lon: m.latlng![1],
                        type: 'peak',
                        href: url }))) as unknown as Promise<Place[]>,
            () => fetch(placesUrl).then(r => r.json() as Promise<Place[]>),
            // Local overlay datasets with real line/polygon geometry (see
            // src/layers/landforms.tsx etc) - not otherwise searchable at all.
            placesFromGeoJson('/data/protectedAreas.json'),
            placesFromGeoJson('/data/waterFeatures.json'),
            placesFromGeoJson('/data/landforms.json'),
            placesFromGeoJson('/data/geologicalFeatures.json'),
            placesFromGeoJson('/data/glaciers.json'),
            placesFromGeoJson('/data/ridges.json'),
            // placesUrl (search.topos.nz) already carries the ~3500 gazetteer
            // localities (small settlements etc) - only add localities.json's
            // OSM-sourced features here, or every one of those would show up
            // as a duplicate search result. This is specifically what makes
            // community-mapped-only names (e.g. "Mount Potts Ski Field", a
            // heli-ski area with no NZGB Gazetteer entry) searchable at all.
            placesFromGeoJson('/data/localities.json', f => f.properties?.source === 'osm'),
            // Note: NZ Land District region polygons (public/data/regions.json,
            // scripts/update_regions.py) deliberately aren't a source here - a
            // whole region is far too coarse to be a "place" in its own right
            // (a search result for it, or a long-press match), so it's kept
            // out of this general places pool entirely. See
            // src/search/regions.ts's findContainingRegion for the one thing
            // it's actually used for: annotating another place with the
            // region it falls within.
        ])
    }
    return placesPromise
}

/**
 * Finds a place purely by exact name, ignoring location entirely - unlike
 * closestPlace's proximity search (see src/search/nearest.ts), which is
 * unreliable for a large, irregular polygon: a dogleg lake's bbox centre
 * (used as its lat/lon - see placesFromGeoJson) can be several km from its
 * own shoreline (Lake Wānaka's is ~1.9km outside it, Lake Ōhau's ~3km), well
 * past closestPlace's 100m threshold. Used specifically to recover a known
 * feature's real geometry (for SelectedShapeHighlight) once its name is
 * already known, not for identifying what's nearby in the first place.
 */
export const findPlaceByExactName = async (name: string): Promise<Place | undefined> => {
    const places = await getPlaces()
    return places.find(p => p.name === name)
}
