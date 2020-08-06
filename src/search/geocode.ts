const baseUrl = 'https://nominatim.openstreetmap.org/search'
export interface GeocodeResult {
    lat: number;
    lng: number;
    boundingbox: [number,number,number,number];
    displayName: string;
    category: string;
    type: string;
}

export default async (query: string): Promise<GeocodeResult[]> => {
    // Hackily include the country because the nominatim API is terrible.
    query = query + ", NZ";
    const results: GeocodeResult[] = await fetch(`${baseUrl}?q=${encodeURIComponent(query)}&format=jsonv2`)
        .then(r => r.json());

    for (const result of results) {
        result['displayName'] = result['display_name'];
    }
    return results;
}