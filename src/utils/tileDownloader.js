import { latLngToTile } from './slippyCoords';

const ESTIMATED_TILE_SIZE = 40 * 1024; // Estimate each tile at 40kb.

export class TileDownloader {
    constructor(bounds, startZoom, maxZoom = 17, numWorkers = 50) {
        this.min = bounds.getNorthWest();
        this.max = bounds.getSouthEast();
        this.startZoom = Math.floor(startZoom);

        // Max zoom should be at most 15, unless we're super zoomed in, then at most 17.
        this.maxZoom = Math.min(17, Math.max(this.startZoom + 3, 15));
        this.numWorkers = numWorkers;
    }

    numTiles() {
        let zoom = this.startZoom;
        let tiles = 0;

        while (zoom <= this.maxZoom) {
            const { x: minX, y: minY } = latLngToTile(this.min, zoom);
            const { x: maxX, y: maxY } = latLngToTile(this.max, zoom);

            tiles += (maxX - minX + 1) * (maxY - minY + 1);
            zoom++;
        }

        return tiles;
    }

    estimatedSize() {
        return this.numTiles() * ESTIMATED_TILE_SIZE;
    }

    *tiles(zoom) {
        if (zoom === undefined)
            zoom = this.startZoom;

        const { x: minX, y: minY } = latLngToTile(this.min, zoom);
        const { x: maxX, y: maxY } = latLngToTile(this.max, zoom);

        for (let x = minX; x <= maxX; ++x)
            for (let y = minY; y <= maxY; ++y)
                yield { x, y, z: zoom };

        if (zoom < this.maxZoom)
            yield* this.tiles(zoom + 1);
    }

    async downloadTiles(tileUrl, onProgress) {
        onProgress = onProgress || (() => { });

        const servers = "abc";
        const totalTiles = this.numTiles();
        let downloadedTiles = 0;

        const queue = this.tiles();

        const worker = async () => {
            let result = queue.next();
            while (!result.done) {
                const tile = result.value;
                const url = tileUrl
                    .replace("{s}", servers[downloadedTiles++ % servers.length])
                    .replace("{x}", tile.x)
                    .replace("{y}", tile.y)
                    .replace("{z}", tile.z);

                // Only download tiles we haven't seen.
                if (!await caches.match(url))
                    await fetch(url);

                onProgress(downloadedTiles / totalTiles);
                result = queue.next();
            }
        }

        const workers = [];
        for (let i = 0; i < this.numWorkers; ++i)
            workers.push(worker());

        await Promise.all(workers);
    }
}