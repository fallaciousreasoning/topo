import * as localforage from "localforage";
import XYZ, { Options } from "ol/source/XYZ";
import { TileCoord } from "ol/tilecoord";
import TileState from "ol/TileState";
import { LayerDefinition } from "../layers/layerDefinitions";
import { getCurrentSettings } from '../stores/settings';

type CacheOptions = Omit<Options, "url"> & {
    name: string;
    url: string | ((tile: TileCoord) => string)
}

const getShouldCache = async (layer: { name: string }) => {
    const store = await getCurrentSettings();
    return store.baseLayers[layer.name].cache;
}

export const getCacheId = (props: { name }, tile: TileCoord) => `${props.name}/${tile[2]}/${tile[0]}/${tile[1]}`;

export const getTileCacher = (props: { name: string }) => async (tile: TileCoord, source: string) => {
    const shouldCache = getShouldCache(props);
    const cacheId = getCacheId(props, tile);

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
            try {
                const url = await cacher(tile.getTileCoord(), source);
                const image: HTMLImageElement = tile['getImage']();
                image.src = url;
            } catch (err) {
                tile.setState(TileState.ERROR);
            }
        }
    })
}