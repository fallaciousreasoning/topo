import { writable } from "svelte/store";

export type Mountain = {
    link: string;
    name: string,
    altitude: string,
    description: string | null,
    latlng?: [number, number],
    routes: Route[],
    places: Mountain[],
    image: string | null,
    images: string[]
}
export type Mountains = {
    [href: string]: Mountain
}

export interface Pitch {
    ewbank: string;
    alpine: string;
    commitment: string;
    mtcook: string;
    aid: string;
    ice: string;
    mixed: string;
    boulder: string;
    length: string;
    bolts: string;
    trad: boolean;
    description: string;
}

export interface Route {
    name: string;
    link: string;
    image?: string;
    grade: string;
    length: string;
    pitches: Pitch[];
    quality: number;
    bolts: string;
    natural_pro: boolean;
    description: string;
    ascent: string;
}

const createStore = () => {
    let lastValue: Mountains = {}
    const { subscribe, set, update } = writable<Mountains>(lastValue);

    return {
        subscribe,
        set: (newValue: Mountains) => {
            set(newValue);
            lastValue = newValue;
        },
        get: () => lastValue
    };
}

export default createStore();
