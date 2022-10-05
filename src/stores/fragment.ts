import { writable } from 'svelte/store';
import round from '../utils/round';

type Pages = `menu` | `settings` | `tracks` | `tracks/${string}`;

interface Store {
    position: {
        lat: number;
        lng: number;
        zoom: number;
        rotation: number;
    },

    baseLayer: number;

    label: {
        lat: number;
        lng: number;
        text: string;
    },

    page: Pages;
}

// Number of decimal places to keep in the url.
const DPS = 5;

const parseHash = (): Store => {
    const params = new URLSearchParams(window.location.hash.substr(1));
    const getNum = (key: string) => parseFloat(params.get(key));

    return {
        position: {
            lat: getNum('lat'),
            lng: getNum('lng'),
            zoom: getNum('zoom'),
            rotation: getNum('rotation')
        },
        baseLayer: parseInt(params.get('baseLayer')) || 0,
        label: {
            lat: getNum('lla'),
            lng: getNum('llo'),
            text: params.get('lab')
        },
        page: params.get('page') as Pages
    }
}

const updateHashFromStore = (store: Store) => {
    const { position, label, baseLayer, page } = store;
    const params = getParams();

    // Set position.
    if (position.lat)
        params.set("lat", roundedS(position.lat));
    if (position.lng)
        params.set("lng", roundedS(position.lng));
    if (position.zoom)
        params.set("zoom", roundedS(position.zoom));
    params.set("rotation", roundedS(isNaN(position.rotation) ? 0 : position.rotation));

    // Set label
    if (label.lat && label.lng) {
        params.set('lla', roundedS(label.lat));
        params.set('llo', roundedS(label.lng));
        params.set('lab', label.text ?? '');
    } else {
        params.delete('lla');
        params.delete('llo');
        params.delete('lab');
    }

    // Set Page
    if (page) {
        params.set("page", page);
    } else {
        params.delete("page");
    }

    // Set base layer
    params.set("baseLayer", baseLayer.toString());

    window.location.hash = params.toString();
}

const getParams = () => new URLSearchParams(window.location.hash.substr(1));
const roundedS = (n: number) => round(n, DPS).toString();

const customStore = () => {
    const initialValue = parseHash();
    const { subscribe, update, set } = writable(initialValue, () => {
        const handleHashChange = () => set(parseHash());
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    });

    subscribe(store => {
        updateHashFromStore(store);
    })

    return {
        subscribe,
        update,
        set
    }
}

export default customStore();
