import XYZ from "ol/source/XYZ";
import { Options } from "ol/source/XYZ";
import * as localforage from "localforage";
import { TileCoord } from "ol/tilecoord";
import settings, { getCurrentSettings } from '../stores/settings';
import { get } from 'svelte/store';

type CacheOptions = Omit<Options, "url"> & {
    name: string;
    url: string | ((tile: TileCoord) => string)
}

const getShouldCache = async (layer: { name: string }) => {
    const store = await getCurrentSettings();
    return store.baseLayers[layer.name].cache;
}

export const getTileCacher = ({ name }: { name: string }) => async (tile: TileCoord, source: string) => {
    const shouldCache = getShouldCache({ name });
    const cacheId = `${name}/${tile[2]}/${tile[0]}/${tile[1]}`;

    let data: Blob;
    if (shouldCache) {
        data = await localforage.getItem(cacheId);
    }

    if (!data) {
        const response = await fetch(source);
        data = await response.blob();

        if (shouldCache)
            localforage.setItem(cacheId, data);
    }
    return URL.createObjectURL(data);
}

export default (options: CacheOptions) => {
    const cacher = getTileCacher(options);
    const { url, ...rest } = options;
    if (typeof url === "string")
        rest["url"] = url;
    else rest.tileUrlFunction = url;

    return new XYZ({
        ...rest,
        tileLoadFunction: async (tile, source) => {
            const url = await cacher(tile.getTileCoord(), source);
            const image: HTMLImageElement = tile['getImage']();
            image.src = url;
        }
    })
}