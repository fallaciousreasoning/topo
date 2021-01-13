import { readable } from 'svelte/store';
import round from '../utils/round';

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

    page: string;
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
        page: params.get('page')
    }
}

const getParams = () => new URLSearchParams(window.location.hash.substr(1));
const roundedS = (n: number) => round(n, DPS).toString();

export const setLabel = (label: Store['label']) => {
    const params = getParams();
    params.set('lla', roundedS(label.lat));
    params.set('llo', roundedS(label.lng));
    params.set('lab', label.text);
    window.location.hash = params.toString();
}

export const setPosition = (position: Store["position"]) => {
    const params = getParams();
    params.set("lat", roundedS(position.lat));
    params.set("lng", roundedS(position.lng));
    params.set("zoom", roundedS(position.zoom));
    params.set("rotation", roundedS(isNaN(position.rotation) ? 0 : position.rotation));
    window.location.hash = params.toString();
}

export const setPage = (page: string) => {
    const params = getParams();
    if (page) {
        params.set("page", page);
    } else {
        params.delete("page");
    }
    window.location.hash = params.toString();
}

export const setBaseLayer = (baseLayer: number) => {
    const params = getParams();
    params.set("baseLayer", baseLayer.toString());
    window.location.hash = params.toString();
}

export default readable<Store>(parseHash(), set => {
    const update = () => {
        set(parseHash());
    };
    update();
    window.addEventListener('hashchange', update);

    return () => window.removeEventListener('hashchange', update);
});