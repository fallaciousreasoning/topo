import XYZ from "ol/source/XYZ";
import { Options } from "ol/source/XYZ";
import * as localforage from "localforage";
import { TileCoord } from "ol/tilecoord";

type CacheOptions = Options & {
    getCacheId: (tile: TileCoord) => string;
}

export default (options: CacheOptions) => {
    return new XYZ({
        ...options,
        tileLoadFunction: async (tile, source) => {
            const cacheId = options.getCacheId(tile.getTileCoord());

            let data: Blob = await localforage.getItem(cacheId);
            if (!data) {
                const response = await fetch(source);
                data = await response.blob();
                localforage.setItem(cacheId, data);
            }
            const image: HTMLImageElement = tile['getImage']();
            const url = URL.createObjectURL(data);
            image.src = url;
        }
    })
}