const osmUrl = 'https://nominatim.openstreetmap.org/search'
const nzPlacesUrl = "https://nz-places.now.sh/api/search";

export interface GeocodeResult {
    lat: number;
    lon: number;
    name: string;
    type: string;
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
    const url = `${nzPlacesUrl}?query=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

export default async (query: string, sources=[searchNzPlaces,searchOsm]): Promise<GeocodeResult[]> => {
    const results = await Promise.all(sources.map(s => s(query)));
    return results.reduce((prev, next) => [...prev, ...next], [])
}