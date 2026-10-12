#!/usr/bin/env tsx
/**
 * Bundle a tile pyramid directory into a single .tilebundle file.
 *
 * Usage:
 *   tsx scripts/bundle-tiles.ts <tileDir|tiles.mbtiles> <outputFile> [--max-zoom <z>] [--min-zoom <z>] [--region <id>]
 *
 * Input is either a tile directory in the standard z/x/y.<ext> layout, or an
 * .mbtiles file (read directly, TMS rows flipped to XYZ, gzipped tiles
 * decompressed to match what a directory export holds).
 * Tiles are written lowest-zoom-first, so a client streaming the bundle can
 * extract usable (if coarse) tiles well before the whole file has downloaded,
 * and an interrupted download leaves a usable map rather than scattered
 * high-zoom fragments with no overview.
 *
 * --region filters tiles to those intersecting the named region's bbox
 * (see src/tilebundle/regions.ts), e.g. --region south-island.
 */

import { createWriteStream, WriteStream } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { gunzipSync } from 'node:zlib';
import { encodeTile } from '../src/tilebundle/index';
import { NZ_REGIONS } from '../src/tilebundle/regions';

function usage(): never {
    console.error('Usage: bundle-tiles <tileDir|tiles.mbtiles> <outputFile> [--max-zoom <z>] [--min-zoom <z>] [--region <id>]');
    process.exit(1);
}

/** Standard slippy-map XYZ tile math (WebMercatorQuad). */
function lonToTileX(lon: number, z: number): number {
    return Math.floor(((lon + 180) / 360) * (1 << z));
}

function latToTileY(lat: number, z: number): number {
    const latRad = (lat * Math.PI) / 180;
    return Math.floor(
        ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * (1 << z),
    );
}

interface TileBounds {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
}

/** Compute the per-zoom tile bounds covering a region's bbox. */
function regionTileBounds(regionId: string, z: number): TileBounds {
    const region = NZ_REGIONS.find(r => r.id === regionId);
    if (!region) {
        console.error(`Unknown region "${regionId}". Valid ids: ${NZ_REGIONS.map(r => r.id).join(', ')}`);
        process.exit(1);
    }
    const lngs = region.polygon.map(p => p[0]);
    const lats = region.polygon.map(p => p[1]);
    const west = Math.min(...lngs);
    const east = Math.max(...lngs);
    const south = Math.min(...lats);
    const north = Math.max(...lats);

    const n = 1 << z;
    return {
        xMin: Math.max(0, lonToTileX(west, z)),
        xMax: Math.min(n - 1, lonToTileX(east, z)),
        yMin: Math.max(0, latToTileY(north, z)),
        yMax: Math.min(n - 1, latToTileY(south, z)),
    };
}

function write(stream: WriteStream, data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
        const ok = stream.write(data, err => { if (err) reject(err); });
        if (ok) resolve();
        else stream.once('drain', resolve);
    });
}

interface TileSource {
    zoomLevels(): Promise<number[]>;
    /** Tiles at zoom z within bounds, in x then y order. */
    tiles(z: number, bounds?: TileBounds): AsyncIterable<{ x: number; y: number; data: Uint8Array }>;
}

function inBounds(x: number, y: number, bounds?: TileBounds): boolean {
    return !bounds || (x >= bounds.xMin && x <= bounds.xMax && y >= bounds.yMin && y <= bounds.yMax);
}

function directorySource(tileDir: string): TileSource {
    return {
        zoomLevels: async () => (await readdir(tileDir)).map(d => parseInt(d, 10)).filter(z => !isNaN(z)),
        async *tiles(z, bounds) {
            const zDir = join(tileDir, String(z));
            const xs = (await readdir(zDir))
                .map(d => parseInt(d, 10))
                .filter(x => !isNaN(x))
                .filter(x => !bounds || (x >= bounds.xMin && x <= bounds.xMax))
                .sort((a, b) => a - b);

            for (const x of xs) {
                const xDir = join(zDir, String(x));
                const yFiles = (await readdir(xDir))
                    .filter(f => /^\d+\.\w+$/.test(f))
                    .filter(f => inBounds(x, parseInt(f, 10), bounds))
                    .sort((a, b) => parseInt(a) - parseInt(b));

                for (const yFile of yFiles) {
                    const data = await readFile(join(xDir, yFile));
                    yield { x, y: parseInt(yFile), data: new Uint8Array(data) };
                }
            }
        },
    };
}

function mbtilesSource(path: string): TileSource {
    const db = new DatabaseSync(path, { readOnly: true });
    return {
        zoomLevels: async () => (db.prepare('SELECT DISTINCT zoom_level AS z FROM tiles').all() as { z: number }[]).map(r => r.z),
        async *tiles(z, bounds) {
            const max = (1 << z) - 1;
            // XYZ y ascending == TMS row descending
            const rows = db.prepare(
                'SELECT tile_column AS x, tile_row AS row, tile_data AS data FROM tiles WHERE zoom_level = ? ORDER BY tile_column, tile_row DESC',
            ).iterate(z) as Iterable<{ x: number; row: number; data: Uint8Array }>;
            for (const { x, row, data } of rows) {
                const y = max - row;
                if (!inBounds(x, y, bounds)) continue;
                const isGzipped = data[0] === 0x1f && data[1] === 0x8b;
                yield { x, y, data: isGzipped ? new Uint8Array(gunzipSync(data)) : data };
            }
        },
    };
}

async function main() {
    const args = process.argv.slice(2);
    let tileDir: string | undefined;
    let outputFile: string | undefined;
    let maxZoom = Infinity;
    let minZoom = 0;
    let region: string | undefined;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--max-zoom') {
            maxZoom = parseInt(args[++i], 10);
        } else if (args[i] === '--min-zoom') {
            minZoom = parseInt(args[++i], 10);
        } else if (args[i] === '--region') {
            region = args[++i];
        } else if (!tileDir) {
            tileDir = args[i];
        } else if (!outputFile) {
            outputFile = args[i];
        } else {
            usage();
        }
    }

    if (!tileDir || !outputFile) usage();

    const source = tileDir.endsWith('.mbtiles') ? mbtilesSource(tileDir) : directorySource(tileDir);

    // Lowest zoom first (see format note above).
    const zoomLevels = (await source.zoomLevels())
        .filter(z => z >= minZoom && z <= maxZoom)
        .sort((a, b) => a - b);

    if (zoomLevels.length === 0) {
        console.error(`No zoom levels found in ${tileDir} within z${minZoom}–z${maxZoom}`);
        process.exit(1);
    }

    console.log(`Zoom levels to bundle: ${zoomLevels.join(', ')}`);
    if (region) console.log(`Region filter: ${region}`);

    const out = createWriteStream(outputFile);
    let tileCount = 0;
    let byteCount = 0;

    for (const z of zoomLevels) {
        const bounds = region ? regionTileBounds(region, z) : undefined;
        let zTiles = 0;

        for await (const { x, y, data } of source.tiles(z, bounds)) {
            const record = encodeTile(data, z, x, y);
            await write(out, record);
            tileCount++;
            zTiles++;
            byteCount += record.length;
        }

        console.log(`  z${z}: ${zTiles} tiles`);
    }

    await new Promise<void>((resolve, reject) => out.end(err => err ? reject(err) : resolve()));

    const mb = (byteCount / 1024 / 1024).toFixed(1);
    console.log(`\nWrote ${tileCount} tiles (${mb} MB) → ${outputFile}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
