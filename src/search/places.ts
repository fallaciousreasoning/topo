import huts from '../layers/huts'
import mountains from '../layers/mountains';

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
            huts.getData,
            () => mountains.getData()
                .then(r => Object.entries(r)
                    .filter(([, m]) => m.latlng?.length && m.name)
                    .map(([url, m]) => ({ name: m.name, lat: m.latlng![0], lon: m.latlng![1], type: 'peak', href: url }))),
            () => fetch(placesUrl).then(r => r.json() as Promise<Place[]>),
        ])
    }
    return placesPromise
}
