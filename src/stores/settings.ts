import { create } from 'ol/transform';
import { get, readable, writable } from 'svelte/store';
import localForage from 'localforage';
import { debounce } from '../utils/debounce';
import BaseLayer from 'ol/layer/Base';
import { applyUpdate } from '../utils/assign';
import { layerDefinitions, linzTopo } from '../layers/layerDefinitions';
import { resolvable } from '../utils/promise';

interface BaseLayerSettings {
    cache: boolean;
}

interface Store {
    theme: {
        primaryThemeColor: string;
        seconaryThemeColor: string;
        background: 'light' | 'dark' | 'auto';
    }

    baseLayers: {
        [key: string]: BaseLayerSettings;
    }
}

const settingsKey = "settings";

const defaultBaseLayerSettings: BaseLayerSettings = {
    cache: false
};

const defaultValue: Store = {
    baseLayers: layerDefinitions.reduce((prev, next) => ({ ...prev, [next.name]: defaultBaseLayerSettings }), {}),
    theme: {
        primaryThemeColor: 'purple',
        seconaryThemeColor: 'orange',
        background: 'auto'
    }
};
defaultValue.baseLayers[linzTopo.name].cache = true;

const loadSettings = () => localForage.getItem<Store>(settingsKey);
const saveSettings = (settings: Store) => localForage.setItem(settingsKey, settings);

const { resolve, promise } = resolvable<Store>();
const createStore = () => {
    const {subscribe, set, update } = writable<Store>(defaultValue);

    // Load settings from disk.
    loadSettings().then(settings => {
        if (!settings)
            return;
        set(settings);
        resolve(settings)
    });

    const updaterFor = <Key extends keyof Store>(key: Key) => (newSettings: Partial<Store[Key]>) => {
        return update(oldStore => applyUpdate(key, oldStore, newSettings));
    }

    const baseLayerUpdater = (id: string, layer: Partial<BaseLayerSettings>) => {
        return update(oldStore => {
            const wholeLayer: BaseLayerSettings = {...defaultBaseLayerSettings, ...oldStore.baseLayers[id], ...layer };
            return applyUpdate("baseLayers", oldStore, { [id]: wholeLayer })
        });
    }

    subscribe(store => {
        saveSettings(store);
    })

    return {
        subscribe,
        updateTheme: updaterFor('theme'),
        updateBaseLayers: updaterFor('baseLayers'),
        updateBaseLayer: baseLayerUpdater
    }
}

const store = createStore();
export default store;

export const getCurrentSettings = async () => {
    await promise;
    return get(store);
};