import { create } from 'ol/transform';
import { readable, writable } from 'svelte/store';
import localForage from 'localforage';
import { debounce } from '../utils/debounce';
import BaseLayer from 'ol/layer/Base';
import { applyUpdate } from '../utils/assign';

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
    baseLayers: {},
    theme: {
        primaryThemeColor: 'purple',
        seconaryThemeColor: 'orange',
        background: 'auto'
    }
};

const loadSettings = () => localForage.getItem<Store>(settingsKey);
const saveSettings = (settings: Store) => localForage.setItem(settingsKey, settings);

const createStore = () => {
    const {subscribe, set, update } = writable<Store>(defaultValue);

    // Load settings from disk.
    loadSettings().then(settings => {
        if (!settings)
            return;
        set(settings);
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

    subscribe(store => saveSettings(store))

    return {
        subscribe,
        updateTheme: updaterFor('theme'),
        updateBaseLayers: updaterFor('baseLayers'),
        updateBaseLayer: baseLayerUpdater
    }
}

export default createStore();