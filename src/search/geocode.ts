// import initSearch, {search} from 'nz-search'

const osmUrl = 'https://nominatim.openstreetmap.org/search'
const nzPlacesUrl = "https://nz-places.now.sh/api/search";

export interface GeocodeResult {
    lat: number;
    lon: number;
    name: string;
    type: string;
}

let initPromise: Promise<typeof import('nz-search')>;
function getSearch() {
    if (!initPromise) {
        initPromise = (async () => {
            const [places, searchApi] = await Promise.all([(await fetch('data/places.json')).arrayBuffer(), import('nz-search')])
            await searchApi.default()
            searchApi.load_data(new Uint8Array(places))
            return searchApi
        })()
    }
    return initPromise
}

const searchOsm = async (query: string): Promise<GeocodeResult[]> => {
    // Hackily include the country because the nominatim API is terrible.
    query = query + ", NZ";
    const results: GeocodeResult[] = await fetch(`${osmUrl}?q=${encodeURIComponent(query)}&format=jsonv2`)
        .then(r => r.json());

    for (const result of results) {
        result['name'] = result['display_name'];
    }
    return results;
}

const searchNzPlaces = async (query: string): Promise<GeocodeResult[]> => {
    const api = await getSearch()

    const results = api.search(query, 100)
    return results
}

export const findPlace = async (lat: number, lon: number) => {
    const search = await getSearch()
    return search.closest_place(lat, lon, 0.1)
}

export default async (query: string, sources=[searchNzPlaces]): Promise<GeocodeResult[]> => {
    const results = await Promise.all(sources.map(s => s(query)));
    return results.reduce((prev, next) => [...prev, ...next], [])
}
