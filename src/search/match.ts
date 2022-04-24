import { GeocodeResult } from "./geocode";

// Note: Note all of these are supported by the search service...
const substitutions = {
    'mt': 'mount',
    'pk': 'peak',
    'pt': 'point'
};

export const filterResults = (results: GeocodeResult[], query: string) => {
    query = query.toLowerCase();
    const queries = [query];

    // Work out all the variations.
    for (const [abbr, full] of Object.entries(substitutions)) {
        if (query.includes(abbr))
        queries.push(query.replace(abbr, full));
    }

    return results.filter(r => queries.some(q => r.name.toLowerCase().includes(q)));
}