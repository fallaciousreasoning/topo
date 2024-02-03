import { getPlaces, type Place } from "./places";

const toRadians = (degrees: number) => degrees * Math.PI / 180

export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const r = 6371.0; // radius of the earth in kilometers
    const dLat = toRadians(lat2 - lat1);
    const lLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRadians(lat1))
        * Math.cos(toRadians(lat2))
        * Math.sin(lLon / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    return r * c;
}

export const closestPlace = (lat: number, lon: number, places: Place[], maxDistance: number) => {
    let minDistance = -1
    let closest: Place | undefined

    for (const place of places) {
        const distance = getDistance(lat, lon, place.lat, place.lon)
        if (distance < minDistance || !closest) {
            minDistance = distance
            closest = place
        }
    }

    if (minDistance < maxDistance) {
        return closest
    }
    return undefined
}

export const findPlace = async (lat: number, lon: number) => closestPlace(lat, lon, await getPlaces(), 0.1)
