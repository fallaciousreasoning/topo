import { UrlFunction } from "ol/Tile";
import { pickRandom } from "../utils/random";
import { TileCoord } from "ol/tilecoord";

export const mapilliaryTileUrl = (tile: TileCoord): string => {
    const source = pickRandom('1234');
    return tileUrl(tile, 'otile'+source)
}

const tileUrl = ([z, x, y]: TileCoord, source: string) => {
    return `http://${source}.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.png`;
}
