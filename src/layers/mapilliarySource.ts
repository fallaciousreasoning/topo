import { UrlFunction } from "ol/Tile";
import { pickRandom } from "../utils/random";
import { TileCoord } from "ol/tilecoord";

export const tileUrlFunction = (tile: TileCoord): string => {
    const source = pickRandom('1234');
    return tileUrl(tile, 'otile'+source)
}

export const tileUrl = ([z, x, y]: TileCoord, source: string) => {
    return `http://${source}.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.png`;
}

export const tileCacheId = (tile: TileCoord) => tileUrl(tile, "x");