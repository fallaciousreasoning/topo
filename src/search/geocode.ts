import { convertNZMGReferenceToLatLng, convertTopo50ReferenceToLatLng } from '../utils/mapReference';
import { getPlaces, type Place } from './places';
import db from '../caches/indexeddb';

// Many NZ place names carry macrons (Wānaka, Tītahi, Pōneke, ...), but most
// people don't bother typing them - normalize both sides so "wanaka" still
// matches "Lake Wānaka".
const stripDiacritics = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const getMatch = (queryParts: string[], place: Place) => {
    const lowerName = stripDiacritics(place.name.toLowerCase());
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
    const lowerQuery = stripDiacritics(query.toLowerCase())
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

const searchMapReferences = async (query: string): Promise<Place[]> => {
    // Try Topo50 (NZTM) first, then NZMG
    const ref = convertTopo50ReferenceToLatLng(query) ?? convertNZMGReferenceToLatLng(query)
    return [ref].filter(r => r).map(([lat, lon]) => ({
        name: query,
        lat,
        lon,
        type: 'map-ref'
    }))
}

const searchPoints = async (query: string, maxResults = 100): Promise<Place[]> => {
    const lowerQuery = stripDiacritics(query.toLowerCase())
    const lowerQueryParts = lowerQuery.split(' ').filter(p => p)

    const points = await db.getPoints()

    const results: Place[] = []
    for (const point of points) {
        const pointName = point.name ?? `Point ${point.id}`
        const match = getMatch(lowerQueryParts, {
            name: pointName,
            lat: point.coordinates[1].toString(),
            lon: point.coordinates[0].toString(),
            type: 'point'
        })
        if (match === 0) continue

        results.push({
            name: pointName,
            lat: point.coordinates[1].toString(),
            lon: point.coordinates[0].toString(),
            type: 'point'
        })
        if (results.length >= maxResults) break
    }
    return results
}

// Each source already caps itself at 100, but combined (points + NZ places +
// map references) that can still add up to several hundred rows - cap the
// combined list too, so SearchSection isn't rendering an enormous list for a
// broad query.
const MAX_RESULTS = 100

export default async (query: string, sources = [searchPoints, searchNzPlaces, searchMapReferences]): Promise<Place[]> => {
    const results = await Promise.all(sources.map(s => s(query)));
    return results.reduce((prev, next) => [...prev, ...next], []).slice(0, MAX_RESULTS)
}
