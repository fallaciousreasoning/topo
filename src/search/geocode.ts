import { getPlaces, type Place } from './places';

const getMatch = (queryParts: string[], place: Place) => {
    const lowerName = place.name.toLowerCase();
    let rank = 0
    let lastMatchIndex: number | undefined = undefined

    for (const part of queryParts) {
        const matchIndex = lowerName.indexOf(part)
        if (matchIndex === -1) return 0

        // If this is the first part, rank it higher if its at the start than if its somewhere else.
        if (lastMatchIndex === undefined) {
            rank += (matchIndex === 0
                ? 1
                : 1 / matchIndex)
        } else {
            const numerator = matchIndex <= lastMatchIndex ? 0.5 : 1
            rank += numerator / Math.abs(matchIndex - lastMatchIndex)
        }
    }
    return rank
}

const searchNzPlaces = async (query: string, maxResults = 100): Promise<Place[]> => {
    const lowerQuery = query.toLowerCase()
    const lowerQueryParts = lowerQuery.split(' ').filter(p => p)

    const places = await getPlaces()

    const results: Place[] = []
    for (const place of places) {
        const match = getMatch(lowerQueryParts, place)
        if (match === 0) continue

        results.push(place)
        if (results.length >= maxResults) break
    }
    return results
}

export default async (query: string, sources = [searchNzPlaces]): Promise<Place[]> => {
    const results = await Promise.all(sources.map(s => s(query)));
    return results.reduce((prev, next) => [...prev, ...next], [])
}
