#!/usr/bin/env tsx
/**
 * Bundle a tile pyramid directory into a single .tilebundle file.
 *
 * Usage:
 *   tsx scripts/bundle-tiles.ts <tileDir> <outputFile> [--max-zoom <z>] [--min-zoom <z>]
 *
 * Tile directory must follow the standard z/x/y.<ext> layout.
 * Tiles are written highest-zoom-first so the top of the pyramid sits at the
 * end of the file, enabling sequential in-place extraction with truncation.
 */

import { createWriteStream, WriteStream } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { encodeTile } from '../src/tilebundle/index';

function usage(): never {
    console.error('Usage: bundle-tiles <tileDir> <outputFile> [--max-zoom <z>] [--min-zoom <z>]');
    process.exit(1);
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

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--max-zoom') {
            maxZoom = parseInt(args[++i], 10);
        } else if (args[i] === '--min-zoom') {
            minZoom = parseInt(args[++i], 10);
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

    const out = createWriteStream(outputFile);
    let tileCount = 0;
    let byteCount = 0;

    for (const z of zoomLevels) {
        const zDir = join(tileDir, String(z));
        const xs = (await readdir(zDir))
            .map(d => parseInt(d, 10))
            .filter(x => !isNaN(x))
            .sort((a, b) => a - b);

        let zTiles = 0;

        for (const x of xs) {
            const xDir = join(zDir, String(x));
            const yFiles = (await readdir(xDir))
                .filter(f => /^\d+\.\w+$/.test(f))
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
