import XYZ from "ol/source/XYZ";
import { TileCoord } from "ol/tilecoord";
import { resolvable } from "../utils/promise";

type TileUrlFunction = (tile: TileCoord) => string;

export default (...sources: [TileUrlFunction, ...TileUrlFunction[]]) => {
    return new XYZ({
        url: 'https://example.com',
        async tileLoadFunction(tile, source) {
            const image: HTMLImageElement = tile['getImage']();
            
            for (const source of sources) {
                image.src = source(tile.getTileCoord());

                const { resolve, promise } = resolvable<boolean>();
                image.addEventListener('error', () => {
                    resolve(false);

                    console.log("Error!")
                }, { once: true });
                image.addEventListener('load', () => resolve(true), { once: true });

                const success = await promise;
                if (success) break;
            }
        }
    })
}