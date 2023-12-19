import localForage from 'localforage';
import { get, writable } from 'svelte/store';
import { layerDefinitions, linzTopo } from '../layers/layerDefinitions';
import { applyUpdate } from '../utils/assign';
import { resolvable } from '../utils/promise';

interface LayerSettings {
    cache: boolean;
}

interface Store {
    theme: {
        primaryThemeColor: string;
        seconaryThemeColor: string;
        background: 'light' | 'dark' | 'auto';
    }

    layers: {
        [key: string]: LayerSettings;
    }
}

const settingsKey = "settings";

const defaultLayerSettings: LayerSettings = {
    cache: false
};

const defaultValue: Store = {
    layers: layerDefinitions.reduce((prev, next) => ({ ...prev, [next.name]: defaultLayerSettings }), {}),
    theme: {
        primaryThemeColor: 'purple',
        seconaryThemeColor: 'orange',
        background: 'auto'
    }
};
defaultValue.layers[linzTopo.name].cache = true;

const loadSettings = () => localForage.getItem<Store>(settingsKey);
const saveSettings = (settings: Store) => localForage.setItem(settingsKey, settings);

const { resolve, promise } = resolvable<Store>();
const createStore = () => {
    const { subscribe, set, update } = writable<Store>(defaultValue);

    // Load settings from disk.
    loadSettings().then(settings => {
        if (settings)
            set(settings);
        resolve(settings)
    });

    const updaterFor = <Key extends keyof Store>(key: Key) => (newSettings: Partial<Store[Key]>) => {
        return update(oldStore => applyUpdate(key, oldStore, newSettings));
    }

    const layerUpdater = (id: string, layer: Partial<LayerSettings>) => {
        return update(oldStore => {
            const wholeLayer: LayerSettings = { ...defaultLayerSettings, ...oldStore.layers[id], ...layer };
            return applyUpdate("layers", oldStore, { [id]: wholeLayer })
        });
    }

    subscribe(store => {
        saveSettings(store);
    })

    return {
        subscribe,
        updateTheme: updaterFor('theme'),
        updateLayers: updaterFor('layers'),
        updateLayer: layerUpdater
    }
}

const store = createStore();
export default store;

export const getCurrentSettings = async () => {
    await promise;
    return get(store);
};
