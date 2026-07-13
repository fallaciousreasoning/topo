import { getHuts } from "../layers/huts";
import { getMountains } from "../layers/mountains";

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
}

/** Bounding box of any GeoJSON geometry - a degenerate (zero-area) box for a Point. */
const bboxOf = (geometry: GeoJSON.Geometry): [number, number, number, number] => {
    const coords: [number, number][] =
        geometry.type === 'Point' ? [geometry.coordinates as [number, number]] :
        geometry.type === 'LineString' ? geometry.coordinates as [number, number][] :
        geometry.type === 'Polygon' ? (geometry.coordinates as [number, number][][])[0] :
        []

    const lons = coords.map(c => c[0])
    const lats = coords.map(c => c[1])
    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
}

/** Loads a local named-feature GeoJSON overlay dataset as search Places, using
 * each feature's real geometry for its bbox rather than treating it as a bare
 * point - so e.g. selecting "Fiordland National Park" or "Lake Taupō" fits the
 * map to its actual shape instead of just recentring on a coordinate. */
const placesFromGeoJson = (url: string) => async (): Promise<Place[]> => {
    const data: GeoJSON.FeatureCollection = await fetch(url).then(r => r.json())
    return data.features
        .filter(f => f.properties?.name)
        .map(f => {
            const [west, south, east, north] = bboxOf(f.geometry)
            return {
                name: f.properties!.name,
                lat: ((south + north) / 2).toString(),
                lon: ((west + east) / 2).toString(),
                type: f.properties!.type ?? 'place',
                bbox: [west, south, east, north],
            }
        })
}

let placesPromise: Promise<Place[]>;

const makePlacesPromise = async (sources: (() => Promise<Place[]>)[]) => {
    return Promise.all(sources.map(s => s())).then(r => r.flat())
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
        ])
    }
    return placesPromise
}
