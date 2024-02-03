const url = '/data/places.json'

export interface Place {
    name: string,
    lat: number,
    lon: number,
    type: string
}

let placesPromise: Promise<Place[]>;

export const getPlaces = () => {
    if (!placesPromise) {
        placesPromise = fetch(url).then(r => r.json())
    }
    return placesPromise
}
