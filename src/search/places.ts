import huts from '../layers/huts'

const placesUrl = '/data/places.json'

export interface Place {
    name: string,
    lat: number,
    lon: number,
    type: string
}

let placesPromise: Promise<Place[]>;

const makePlacesPromise = async (sources: (() => Promise<Place[]>)[]) => {
    return Promise.all(sources.map(s => s())).then(r => r.flat())
}

export const getPlaces = () => {
    if (!placesPromise) {
        placesPromise = makePlacesPromise([
            () => fetch(placesUrl).then(r => r.json() as Promise<Place[]>),
            huts.getData
        ])
    }
    return placesPromise
}
