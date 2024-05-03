import { coordinateToTile } from './slippyCoords';
import { Extent, getTopLeft, getBottomRight, getTopRight } from 'ol/extent';
import { toLonLat } from 'ol/proj';
import { Coordinate } from 'ol/coordinate';
import { TileCoord } from 'ol/tilecoord';
import { getCacheId, getTileCacher } from '../sources/cachingSource';
import { linzTopo } from '../layers/layerDefinitions';
const ESTIMATED_TILE_SIZE = 40 * 1024; // Estimate each tile at 40kb.
type TileUrl = string | ((tile: TileCoord) => string)

export class TileDownloader {
    min: Coordinate;
    max: Coordinate;
    startZoom: number;
    maxZoom: number;
    numWorkers: number;

    constructor(bounds: Extent, startZoom: number, numWorkers = 40) {
        this.min = toLonLat(getTopLeft(bounds));
        this.max = toLonLat(getBottomRight(bounds));
        this.startZoom = Math.floor(startZoom);

        // Max zoom should be at most 15, unless we're super zoomed in, then at most 17.
        this.maxZoom = Math.min(17, Math.max(this.startZoom + 3, 15));
        this.numWorkers = numWorkers;
    }

    numTiles() {
        let zoom = this.startZoom;
        let tiles = 0;

        while (zoom <= this.maxZoom) {
            const { x: minX, y: minY } = coordinateToTile(this.min, zoom);
            const { x: maxX, y: maxY } = coordinateToTile(this.max, zoom);

            tiles += (maxX - minX + 1) * (maxY - minY + 1);
            zoom++;
        }

        return tiles;
    }

    estimatedSize() {
        return this.numTiles() * ESTIMATED_TILE_SIZE;
    }

    *tiles(zoom?: number) {
        if (zoom === undefined)
            zoom = this.startZoom;

        const { x: minX, y: minY } = coordinateToTile(this.min, zoom);
        const { x: maxX, y: maxY } = coordinateToTile(this.max, zoom);

        for (let x = minX; x <= maxX; ++x)
            for (let y = minY; y <= maxY; ++y)
                yield { x, y, z: zoom };

        if (zoom < this.maxZoom)
            yield* this.tiles(zoom + 1);
    }

    async downloadTiles(tileUrl: TileUrl, onProgress: (progress: number) => void) {
        let urlFunc: (coord: TileCoord) => string;
        if (typeof tileUrl === "string") {
            let url = tileUrl;
            urlFunc = ([z, x, y]) => url
                .replace("{s}", servers[downloadedTiles++ % servers.length])
                .replace("{x}", x.toString())
                .replace("{y}", y.toString())
                .replace("{z}", z.toString());
        } else {
            urlFunc = tileUrl;
        }
        onProgress = onProgress || (() => { });

        const servers = "abc";
        const totalTiles = this.numTiles();
        let downloadedTiles = 0;

        const cacher = getTileCacher(linzTopo);
        const queue = this.tiles();

        const worker = async () => {
            let result = queue.next();
            while (!result.done) {
                const tile = result.value;
                const url = urlFunc([tile.z, tile.x, tile.y]);
                getCacheId(linzTopo, [tile.z, tile.x, tile.y]);
                await cacher([tile.z, tile.x, tile.y], url);

                downloadedTiles += 1;
                onProgress(downloadedTiles / totalTiles);
                result = queue.next();
            }
        }

        const workers: Promise<void>[] = [];
        for (let i = 0; i < this.numWorkers; ++i)
            workers.push(worker());

        await Promise.all(workers);
    }
}
