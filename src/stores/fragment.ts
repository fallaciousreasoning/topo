import { readable } from 'svelte/store';
import round from '../utils/round';

interface Store {
    position: {
        lat: number;
        lng: number;
        zoom: number;
        rotation: number;
    }

    label: {
        lat: number;
        lng: number;
        text: string;
    }
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
        label: {
            lat: getNum('lla'),
            lng: getNum('llo'),
            text: params.get('lab')
        }
    }
}

const roundedS = (n: number) => round(n, DPS).toString();

export const setLabel = (label: Store['label']) => {
    const params = new URLSearchParams(window.location.hash.substr(1));
    params.set('lla', roundedS(label.lat));
    params.set('llo', roundedS(label.lng));
    params.set('lab', label.text);
    window.location.hash = params.toString();
}

export default readable<Store>({
    position: {
        lat: undefined,
        lng: undefined,
        zoom: undefined,
        rotation: 0
    },
    label: {
        lat: undefined,
        lng: undefined,
        text: undefined,
    }
}, set => {
    const update =() => {
        set(parseHash());
    };
    update();
    window.addEventListener('hashchange', update);

    return () => window.removeEventListener('hashchange', update);
});