import { iterateTiles } from './index'
import opfsCache from '../caches/opfs'

const BUNDLE_BASE_URL = 'https://pub-36de1a8a322545b9bd6ef274d5f46c7c.r2.dev'

/**
 * `maxZoom` selects the bundle variant: 16 (or unspecified) gets the full-detail HD bundle,
 * 15 or below gets the smaller SD bundle (suffixed `-15`).
 */
export function getBundleUrl(layerId: string, regionCode: string, maxZoom?: number): string {
    if (layerId === 'dem') return `${BUNDLE_BASE_URL}/elevation-tiles.tilebundle`
    const suffix = maxZoom != null && maxZoom <= 15 ? '-15' : ''
    const prefix = layerId === 'topo-raster' ? 'topo' : layerId
    return `${BUNDLE_BASE_URL}/${prefix}-${regionCode.toLowerCase()}${suffix}.tilebundle`
}

/** Actual file sizes (bytes) of the topo-raster island bundles, for showing accurate download estimates. */
export const ISLAND_BUNDLE_SIZES: Record<string, { hd: number, sd: number }> = {
    'north-island': { hd: 7_392_293_788, sd: 2_952_034_428 },
    'south-island': { hd: 10_577_906_577, sd: 4_206_589_166 },
    'stewart-island': { hd: 54_057_847, sd: 23_291_700 },
}

/**
 * Fetch a pre-built tile bundle from `url` and extract every tile into OPFS
 * under `layerId`. Tiles are stored with the given `tileExt` (e.g. 'png').
 *
 * `onProgress` receives a value in [0, 1]:
 *   0–0.5  = downloading the bundle file
 *   0.5–1  = writing tiles to OPFS
 *
 * Pass `signal` to allow cancelling mid-download; a cancelled download throws an `AbortError`.
 *
 * Returns the total number of tiles written.
 */
export async function downloadBundle(
    url: string,
    layerId: string,
    tileExt: string,
    onProgress: (progress: number) => void,
    signal?: AbortSignal,
): Promise<number> {
    // --- Fetch phase ---
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

    const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10)
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is not readable')

    const chunks: Uint8Array[] = []
    let bytesReceived = 0

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        bytesReceived += value.length
        if (contentLength > 0) onProgress((bytesReceived / contentLength) * 0.5)
    }

    // Concatenate into a single buffer
    const bundle = new Uint8Array(bytesReceived)
    let offset = 0
    for (const chunk of chunks) {
        bundle.set(chunk, offset)
        offset += chunk.length
    }

    // --- Extract phase ---
    const totalBytes = bundle.length
    let tilesWritten = 0

    for (const { z, x, y, data, nextSize } of iterateTiles(bundle)) {
        if (signal?.aborted) throw new DOMException('Download cancelled', 'AbortError')
        await opfsCache.saveTile(layerId, `/${z}/${x}/${y}.${tileExt}`, new Blob([data]))
        tilesWritten++
        if (tilesWritten % 200 === 0) {
            onProgress(0.5 + ((totalBytes - nextSize) / totalBytes) * 0.5)
        }
    }

    onProgress(1)
    return tilesWritten
}
