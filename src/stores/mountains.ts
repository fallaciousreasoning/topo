import { writable } from "svelte/store";
import type MountainsJson from '../../public/data/mountains.json'

export type Mountain = typeof MountainsJson[keyof typeof MountainsJson];
export type Mountains = {
    [href: string]: Mountain
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
