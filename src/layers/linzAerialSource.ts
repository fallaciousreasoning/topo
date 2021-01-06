import { UrlFunction } from "ol/Tile";
import { pickRandom } from "../utils/random";
import { TileCoord } from "ol/tilecoord";

export const linzAerialLayerUrl = 'https://tiles-{a-c}.data-cdn.linz.govt.nz/services;key=fcac9d10d1c84527bd2a1ca2a35681d8/tiles/v4/set=4702/EPSG:3857/{z}/{x}/{y}.png'
export const linzAerialTileUrl = (tile: TileCoord): string => {
    const source = pickRandom('abc');
    return tileUrl(tile, source)
}

const tileUrl = ([z,x,y]: TileCoord, source: string) => {
    const layer = '4702';
    return `https://tiles-${source}.data-cdn.linz.govt.nz/services;key=fcac9d10d1c84527bd2a1ca2a35681d8/tiles/v4/set=${layer}/EPSG:3857/${z}/${x}/${y}.png`;
}