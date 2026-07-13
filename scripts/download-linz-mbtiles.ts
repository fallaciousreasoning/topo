#!/usr/bin/env tsx
/**
 * Downloads a full LINZ Basemaps vector tileset as a single .mbtiles file,
 * e.g. https://basemaps.linz.govt.nz/v1/export/topographic-v2/WebMercatorQuad.mbtiles
 *
 * Usage:
 *   tsx scripts/download-linz-mbtiles.ts [outputFile] [--tileset <id>]
 *
 * The export is a multi-gigabyte file served via a short-lived (1 hour)
 * presigned S3 redirect, so a single request can time out or the link can
 * expire mid-transfer. The download is resumed with HTTP Range requests
 * across retries, and picks up where it left off if you re-run the same
 * command after it's interrupted.
 */

import { createWriteStream, existsSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { LINZ_BASEMAPS_KEY } from '../src/layers/config';

const TILE_MATRIX = 'WebMercatorQuad';
const MAX_ATTEMPTS = 20;
const RETRY_DELAY_MS = 5000;

function usage(): never {
    console.error('Usage: download-linz-mbtiles [outputFile] [--tileset <id>]');
    process.exit(1);
}

function exportUrl(tileset: string): string {
    return `https://basemaps.linz.govt.nz/v1/export/${tileset}/${TILE_MATRIX}.mbtiles?api=${LINZ_BASEMAPS_KEY}`;
}

function formatBytes(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Total file size, from Content-Range on a 206 or Content-Length on a 200. */
function totalSizeFrom(response: Response, startByte: number): number | undefined {
    const range = response.headers.get('content-range');
    const match = range && /\/(\d+)$/.exec(range);
    if (match) return parseInt(match[1], 10);

    const length = response.headers.get('content-length');
    return length ? startByte + parseInt(length, 10) : undefined;
}

/**
 * The export URL is itself a redirect to a presigned, short-lived S3 URL.
 * CloudFront appears to cache that redirect's tiny JSON body and will
 * evaluate a Range header against the *cached* body rather than forwarding
 * it upstream, so a Range request sent straight to the export URL can 416
 * even though the real file is huge. Follow the redirect ourselves first,
 * un-ranged, then send the Range header to the actual S3 URL it resolves to.
 */
async function fetchRange(url: string, startByte: number): Promise<Response> {
    const redirect = await fetch(url, { redirect: 'manual' });
    if (redirect.status === 404) {
        throw new Error('Export not found (404) - check the tileset id is correct.');
    }
    if (redirect.status === 403) {
        throw new Error('Request rejected (403) - check LINZ_BASEMAPS_KEY is valid and has export access.');
    }
    const location = redirect.headers.get('location');
    if (!location) {
        throw new Error(`Expected a redirect from the export endpoint, got ${redirect.status} ${redirect.statusText}`);
    }

    const response = await fetch(location, {
        headers: startByte > 0 ? { Range: `bytes=${startByte}-` } : {},
    });
    if (!response.ok) {
        throw new Error(`Unexpected response ${response.status} ${response.statusText}`);
    }
    return response;
}

async function download(url: string, outputFile: string) {
    await mkdir(dirname(outputFile), { recursive: true });

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const onDisk = existsSync(outputFile) ? statSync(outputFile).size : 0;
        if (onDisk > 0) console.log(`  ${formatBytes(onDisk)} already on disk, requesting the rest...`);

        const response = await fetchRange(url, onDisk);
        const resumed = response.status === 206;
        const startByte = resumed ? onDisk : 0;
        if (onDisk > 0 && !resumed) {
            console.log("  Server didn't honour the range request; restarting from scratch.");
        }

        const total = totalSizeFrom(response, startByte);
        if (total !== undefined && startByte >= total) {
            console.log(`Already have the full file (${formatBytes(total)}).`);
            return;
        }

        const out = createWriteStream(outputFile, { flags: startByte > 0 ? 'a' : 'w' });
        const body = Readable.fromWeb(response.body as any);

        let received = startByte;
        let lastLog = 0;
        body.on('data', chunk => {
            received += chunk.length;
            const now = Date.now();
            if (now - lastLog > 1000) {
                lastLog = now;
                const pct = total ? ` (${((received / total) * 100).toFixed(1)}%)` : '';
                process.stdout.write(`\r  ${formatBytes(received)}${total ? ` / ${formatBytes(total)}` : ''}${pct}   `);
            }
        });

        try {
            await pipeline(body, out);
        } catch (err) {
            process.stdout.write('\n');
            console.log(`Attempt ${attempt} failed: ${(err as Error).message}`);
            if (attempt === MAX_ATTEMPTS) break;
            console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await sleep(RETRY_DELAY_MS);
            continue;
        }
        process.stdout.write('\n');

        const finalSize = statSync(outputFile).size;
        if (total === undefined || finalSize >= total) {
            console.log(`Done. Wrote ${formatBytes(finalSize)} to ${outputFile}`);
            return;
        }
        console.log(`Only got ${formatBytes(finalSize)} of ${formatBytes(total)}; resuming.`);
    }

    throw new Error(`Gave up after ${MAX_ATTEMPTS} attempts.`);
}

async function main() {
    const args = process.argv.slice(2);
    let outputFile: string | undefined;
    let tileset = 'topographic-v2';

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--tileset') {
            tileset = args[++i];
        } else if (args[i] === '--help' || args[i] === '-h') {
            usage();
        } else if (!outputFile) {
            outputFile = args[i];
        } else {
            usage();
        }
    }

    outputFile ??= `./out/${tileset}.mbtiles`;

    console.log(`Downloading ${tileset} (${TILE_MATRIX}) -> ${outputFile}`);
    await download(exportUrl(tileset), outputFile);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
