import { UrlFunction } from "ol/Tile";
import { pickRandom } from "../utils/random";
import { TileCoord } from "ol/tilecoord";

export const linzTopoSource = (tile: TileCoord): string => {
    const source = pickRandom('abc');
    return tileUrl(tile, source)
}

export const tileUrl = ([z,x,y]: TileCoord, source: string) => {
    const layer = z < 13 ? '50798' : '50767';
    return `https://tiles-${source}.data-cdn.linz.govt.nz/services;key=d0772bed2204423f87157f7fb1223389/tiles/v4/layer=${layer}/EPSG:3857/${z}/${x}/${y}.png`;
}

export const tileCacheId = (tile: TileCoord) => tileUrl(tile, "x");