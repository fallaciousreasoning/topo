import { iterateTiles } from './index'
import opfsCache from '../caches/opfs'

const BUNDLE_BASE_URL = 'https://pub-36de1a8a322545b9bd6ef274d5f46c7c.r2.dev'

export function getBundleUrl(layerId: string, regionCode: string): string {
    return `${BUNDLE_BASE_URL}/${layerId}-${regionCode}.tilebundle`
}

/**
 * Fetch a pre-built tile bundle from `url` and extract every tile into OPFS
 * under `layerId`. Tiles are stored with the given `tileExt` (e.g. 'png').
 *
 * `onProgress` receives a value in [0, 1]:
 *   0–0.5  = downloading the bundle file
 *   0.5–1  = writing tiles to OPFS
 *
 * Returns the total number of tiles written.
 */
export async function downloadBundle(
    url: string,
    layerId: string,
    tileExt: string,
    onProgress: (progress: number) => void,
): Promise<number> {
    // --- Fetch phase ---
    const response = await fetch(url)
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
        await opfsCache.saveTile(layerId, `/${z}/${x}/${y}.${tileExt}`, new Blob([data]))
        tilesWritten++
        if (tilesWritten % 200 === 0) {
            onProgress(0.5 + ((totalBytes - nextSize) / totalBytes) * 0.5)
        }
    }

    onProgress(1)
    return tilesWritten
}
