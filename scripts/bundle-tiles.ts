#!/usr/bin/env tsx
/**
 * Bundle a tile pyramid directory into a single .tilebundle file.
 *
 * Usage:
 *   tsx scripts/bundle-tiles.ts <tileDir> <outputFile> [--max-zoom <z>] [--min-zoom <z>] [--region <id>]
 *
 * Tile directory must follow the standard z/x/y.<ext> layout.
 * Tiles are written highest-zoom-first so the top of the pyramid sits at the
 * end of the file, enabling sequential in-place extraction with truncation.
 *
 * --region filters tiles to those intersecting the named region's bbox
 * (see src/tilebundle/regions.ts), e.g. --region south-island.
 */

import { createWriteStream, WriteStream } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { encodeTile } from '../src/tilebundle/index';
import { NZ_REGIONS } from '../src/tilebundle/regions';

function usage(): never {
    console.error('Usage: bundle-tiles <tileDir> <outputFile> [--max-zoom <z>] [--min-zoom <z>] [--region <id>]');
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

    // Discover zoom levels present in the directory, highest first.
    const zoomLevels = (await readdir(tileDir))
        .map(d => parseInt(d, 10))
        .filter(z => !isNaN(z) && z >= minZoom && z <= maxZoom)
        .sort((a, b) => b - a);

    if (zoomLevels.length === 0) {
        console.error(`No zoom levels found in ${tileDir} within z${minZoom}–z${maxZoom}`);
        process.exit(1);
    }

    console.log(`Zoom levels to bundle: ${[...zoomLevels].reverse().join(', ')}`);
    if (region) console.log(`Region filter: ${region}`);

    const out = createWriteStream(outputFile);
    let tileCount = 0;
    let byteCount = 0;

    for (const z of zoomLevels) {
        const bounds = region ? regionTileBounds(region, z) : undefined;

        const zDir = join(tileDir, String(z));
        const xs = (await readdir(zDir))
            .map(d => parseInt(d, 10))
            .filter(x => !isNaN(x))
            .filter(x => !bounds || (x >= bounds.xMin && x <= bounds.xMax))
            .sort((a, b) => a - b);

        let zTiles = 0;

        for (const x of xs) {
            const xDir = join(zDir, String(x));
            const yFiles = (await readdir(xDir))
                .filter(f => /^\d+\.\w+$/.test(f))
                .filter(f => !bounds || (() => {
                    const y = parseInt(f, 10);
                    return y >= bounds.yMin && y <= bounds.yMax;
                })())
                .sort((a, b) => parseInt(a) - parseInt(b));

            for (const yFile of yFiles) {
                const y = parseInt(yFile);
                const data = await readFile(join(xDir, yFile));
                const record = encodeTile(new Uint8Array(data), z, x, y);
                await write(out, record);
                tileCount++;
                zTiles++;
                byteCount += record.length;
            }
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
