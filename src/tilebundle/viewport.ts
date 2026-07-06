import opfsCache from '../caches/opfs'
import { tileX, tileY } from './index'
import topoRaster, { topo50Url } from '../layers/topoRaster'
import linzVector from '../layers/linzVector'
import linzAerial from '../layers/linzAerial'
import openTopo from '../layers/openTopo'
import osm from '../layers/osm'
import { BaseLayerDefinition } from '../layers/config'

const rawTileLayers: BaseLayerDefinition[] = [linzVector, linzAerial, openTopo, osm]

/** Rough average tile size per base layer, used to estimate download size before starting. */
const AVG_TILE_BYTES: Record<string, number> = {
    'topo-raster': 15_000,
    'linz-aerial': 30_000,
    'topoVector': 8_000,
    'open-topo': 10_000,
    'osm': 10_000,
}
const DEFAULT_AVG_TILE_BYTES = 15_000

const DEFAULT_MAX_DOWNLOAD_ZOOM = 16

/** Highest zoom available to download, per base layer. LINZ aerial imagery goes deeper than the topo maps. */
const MAX_DOWNLOAD_ZOOM: Record<string, number> = {
    'linz-aerial': 17,
}

/** Highest zoom level worth downloading tiles for, for the given base layer. */
export function getMaxDownloadZoom(baseLayerId: string): number {
    return MAX_DOWNLOAD_ZOOM[baseLayerId] ?? DEFAULT_MAX_DOWNLOAD_ZOOM
}

function extFromUrl(url: string): string {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i)
    if (!match) throw new Error(`Cannot determine tile extension from URL: ${url}`)
    return match[1]
}

export function polygonBbox(polygon: [number, number][]): [number, number, number, number] {
    const lngs = polygon.map(p => p[0])
    const lats = polygon.map(p => p[1])
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]
}

/** True if bbox A fully contains bbox B */
export function bboxContains(
    [aW, aS, aE, aN]: [number, number, number, number],
    [bW, bS, bE, bN]: [number, number, number, number],
) {
    return aW <= bW && aE >= bE && aS <= bS && aN >= bN
}

function tileRange([west, south, east, north]: [number, number, number, number], z: number) {
    return {
        xMin: tileX(west, z),
        xMax: tileX(east, z),
        yMin: tileY(north, z), // north → smaller y (y increases southward)
        yMax: tileY(south, z),
    }
}

/** Number of tiles covering `bbox` across all zooms from `minZoom` to `maxZoom` inclusive. */
export function estimateTileCount(bbox: [number, number, number, number], minZoom: number, maxZoom: number): number {
    let count = 0
    for (let z = minZoom; z <= maxZoom; z++) {
        const { xMin, xMax, yMin, yMax } = tileRange(bbox, z)
        count += (xMax - xMin + 1) * (yMax - yMin + 1)
    }
    return count
}

/** Rough estimated download size in bytes for `tileCount` tiles of `baseLayerId`. */
export function estimateDownloadBytes(baseLayerId: string, tileCount: number): number {
    return tileCount * (AVG_TILE_BYTES[baseLayerId] ?? DEFAULT_AVG_TILE_BYTES)
}

/** The raw (uncomposited, uncached-scheme) tile URL template and file extension actually served for a base layer. */
export function getRawTileSource(baseLayerId: string): { urlTemplate: string, ext: string } {
    if (baseLayerId === topoRaster.id) {
        return { urlTemplate: topo50Url, ext: extFromUrl(topo50Url) }
    }

    const layer = rawTileLayers.find(l => l.id === baseLayerId)
    if (!layer) throw new Error(`Unknown base layer: ${baseLayerId}`)

    const source = Object.values(layer.sources)[0] as { tiles: string[] }
    const urlTemplate = source.tiles[0]
    return { urlTemplate, ext: extFromUrl(urlTemplate) }
}

const CONCURRENCY = 8

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>) {
    let next = 0
    async function runNext(): Promise<void> {
        const i = next++
        if (i >= items.length) return
        await worker(items[i])
        return runNext()
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, runNext))
}

/**
 * Download every tile covering `bbox` for `baseLayerId`, at each zoom from `minZoom` to `maxZoom`
 * inclusive, and cache them in OPFS under `baseLayerId`. Tiles that fail to fetch (e.g. out of
 * range for the source) are skipped rather than aborting the whole download. Tiles already present
 * in the cache are skipped too, so re-running this over the same area resumes rather than redoing it.
 *
 * Returns the number of tiles successfully written.
 */
export async function downloadViewportTiles(
    baseLayerId: string,
    bbox: [number, number, number, number],
    minZoom: number,
    maxZoom: number,
    onProgress: (progress: number) => void,
): Promise<number> {
    const { urlTemplate, ext } = getRawTileSource(baseLayerId)

    const jobs: { z: number, x: number, y: number }[] = []
    for (let z = minZoom; z <= maxZoom; z++) {
        const { xMin, xMax, yMin, yMax } = tileRange(bbox, z)
        for (let x = xMin; x <= xMax; x++) {
            for (let y = yMin; y <= yMax; y++) {
                jobs.push({ z, x, y })
            }
        }
    }

    let tilesWritten = 0
    let completed = 0

    await runPool(jobs, async ({ z, x, y }) => {
        const id = `/${z}/${x}/${y}.${ext}`
        try {
            // Already cached from a previous (possibly interrupted) run — skip re-fetching it.
            if (await opfsCache.loadTile(baseLayerId, id)) {
                tilesWritten++
            } else {
                const url = urlTemplate.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y))
                const response = await fetch(url)
                if (response.ok) {
                    const blob = await response.blob()
                    await opfsCache.saveTile(baseLayerId, id, blob)
                    tilesWritten++
                }
            }
        } catch {
            // network error fetching this tile; skip it
        }
        completed++
        onProgress(completed / jobs.length)
    })

    return tilesWritten
}
