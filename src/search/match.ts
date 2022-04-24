// Note: Note all of these are supported by the search service...
const substitutions = {
    'mt': 'mount',
    'pk': 'peak',
    'pt': 'point'
};

export const nameIsMatch = (place: string, query: string) => {
    query = query.toLowerCase();
    place = place.toLowerCase();
    const queries = [query];
    for (const [abbr, full] of Object.entries(substitutions)) {
        if (query.includes(abbr))
        queries.push(query.replace(abbr, full));
    }

    return queries.some(q => place.includes(q));
}