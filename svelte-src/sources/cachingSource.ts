import XYZ, { Options } from "ol/source/XYZ";
import { TileCoord } from "ol/tilecoord";
import TileState from "ol/TileState";
import { db } from "../db";
import { getCurrentSettings } from '../stores/settings';

type CacheOptions = Omit<Options, "url"> & {
    name: string;
    url: string | ((tile: TileCoord) => string)
}

const getShouldCache = async (layer: { name: string }) => {
    const store = await getCurrentSettings();
    return store.layers?.[layer.name]?.cache ?? true
}

export const getCacheId = (props: { name }, tile: TileCoord) => `${props.name}/${tile[2]}/${tile[0]}/${tile[1]}`;

export const getTileCacher = (props: { name: string }) => async (tile: TileCoord, source: string) => {
    const shouldCache = getShouldCache(props);
    const cacheId = getCacheId(props, tile);

    let data: Blob;
    if (shouldCache) {
        const tile = await db.tiles.get(cacheId);
        data = tile?.data;
    }

    if (!data) {
        const response = await fetch(source);
        data = await response.blob();

        if (shouldCache) {
            db.tiles.put({ id: cacheId, data, layer: props.name }, cacheId)
        }
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
