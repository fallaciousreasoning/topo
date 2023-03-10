import { writable } from 'svelte/store';
import round from '../utils/round';

type Pages = null | `menu` | `settings` | `tracks` | `tracks/${string}` | `mountains` | `mountains/${string}`;

interface Store {
    position: {
        lat: number;
        lng: number;
        zoom: number;
        rotation: number;
    },

    featureLayers: string[];

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
    const params = new URLSearchParams(window.location.hash.substring(1));
    const getNum = (key: string) => parseFloat(params.get(key));

    return {
        position: {
            lat: getNum('lat'),
            lng: getNum('lng'),
            zoom: getNum('zoom'),
            rotation: getNum('rotation')
        },
        featureLayers: (params.get('layers') ?? '').split(',').filter(x => x),
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
    const replaceableParams = new Set(['lat', 'lng', 'zoom', 'rotation']);
    const { position, label, baseLayer, page } = store;
    const oldParams = getParams();
    const params = getParams();

    // Set position.
    if (position.lat)
        params.set("lat", roundedS(position.lat));
    if (position.lng)
        params.set("lng", roundedS(position.lng));
    if (position.zoom)
        params.set("zoom", roundedS(position.zoom));
    params.set("rotation", roundedS(isNaN(position.rotation) ? 0 : position.rotation));

    if (store.featureLayers?.length) {
        params.set("layers", store.featureLayers.join(','))
    } else {
        params.delete("layers");
    }

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

    // We don't push history if only the map location has changed, so we need
    // to do a bit of analysis to see if anything important has changed
    const oldKeys = [...oldParams.keys()].filter(k => !replaceableParams.has(k));
    const newKeys = [...params.keys()].filter(k => !replaceableParams.has(k));

    const deleted = oldKeys.filter(k => !params.has(k))
    const added = newKeys.filter(k => !oldParams.has(k))
    const changed = newKeys.filter(k => params.get(k) !== oldParams.get(k))
    
    if (deleted.length || added.length || changed.length) {
        window.location.hash = params.toString();
    } else {
        const url = window.location.href
        window.location.replace(`${url.substring(0, url.indexOf('#'))}#${params.toString()}`)
    }

}

const getParams = () => new URLSearchParams(window.location.hash.substring(1));
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
