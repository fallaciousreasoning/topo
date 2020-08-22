import XYZ from "ol/source/XYZ";
import { Options } from "ol/source/XYZ";
import * as localforage from "localforage";
import { TileCoord } from "ol/tilecoord";

type GetCacheId = (tile: TileCoord) => string;
type CacheOptions = Options & {
    getCacheId: GetCacheId;
}

export const getTileCacher = (getCacheId: GetCacheId) => async (tile: TileCoord, source: string) => {
    const cacheId = getCacheId(tile);

    let data: Blob = await localforage.getItem(cacheId);
    if (!data) {
        const response = await fetch(source);
        data = await response.blob();
        localforage.setItem(cacheId, data);
    }
    return URL.createObjectURL(data);
}

export default (options: CacheOptions) => {
    const cacher = getTileCacher(options.getCacheId);
    return new XYZ({
        ...options,
        tileLoadFunction: async (tile, source) => {
            const url = await cacher(tile.getTileCoord(), source);
            const image: HTMLImageElement = tile['getImage']();
            image.src = url;
        }
    })
}