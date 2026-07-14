import { addProtocol, getData } from './protocols'
import { getSetting, addListener as addSettingsListener } from '../utils/settings'
import { isRasterUrl, loadRasterTileWithFallback } from './rasterFallback'
import { loadVectorTileWithFallback } from './vectorFallback'
import opfsCache from './opfs'

interface NetworkInformation {
    saveData: boolean,
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g',
}

// A plain resolved-Promise wrapper (rather than `import('./opfs')`) so the shape callers already
// rely on (`cacherPromise.then(r => r.default)`) doesn't change - opfs.ts is also statically
// imported elsewhere (viewport.ts), so the dynamic import never actually achieved any real
// code-splitting anyway (Vite warns about exactly this). Worse, mixing a dynamic and static
// import of the same module - one that itself reaches a `new Worker(new URL(...))` - triggered a
// Rollup production-build bug (`Parse error @:1:1` in vite:reporter's generateBundle, from a
// corrupted chunk) as soon as a new static importer of opfs.ts was added elsewhere. Removing the
// dynamic import sidesteps it entirely.
export const cacherPromise = Promise.resolve({ default: opfsCache })
const failed = { data: null }

let cacheLayers = new Set<string>(getSetting('cacheLayers'))

addSettingsListener(key => {
    if (key !== 'cacheLayers') return
    cacheLayers = new Set(getSetting('cacheLayers'))
})

/** Whether the user has enabled offline caching for the given layer id. */
export const isCacheEnabled = (layer: string): boolean => cacheLayers.has(layer)

function hasGoodConnection(): boolean {
    const connection: NetworkInformation | undefined = (navigator as any).connection
    if (!connection) return true
    return !connection.saveData && connection.effectiveType === '4g'
}

// Races a set of promises and resolves with the first non-null value, or
// null once all of them have settled without producing one.
function firstNonNull<T>(promises: Promise<T | null>[]): Promise<T | null> {
    return new Promise(resolve => {
        let remaining = promises.length
        for (const promise of promises) {
            promise.then(value => {
                if (value != null) {
                    resolve(value)
                } else if (--remaining === 0) {
                    resolve(null)
                }
            }).catch(() => {
                if (--remaining === 0) resolve(null)
            })
        }
    })
}

addProtocol('maybe-cache', async (params, abortController) => {
    const [url, layer] = params.url.split('://')[1]
        .split('#')

    const cacher = await cacherPromise.then(r => r.default)

    async function fetchFromNetwork(u: string): Promise<ArrayBuffer | null> {
        try {
            const { data } = await getData({ ...params, url: 'https://' + u }, abortController)
            // Don't persist empty (HTTP 204) responses: a tile can legitimately return no data
            // for reasons that aren't permanent (rate limiting, a transient server hiccup), and
            // caching that would pin "confirmed empty" forever, blocking both a later retry and
            // (for vector tiles) the ancestor fallback below.
            if (cacheLayers.has(layer) && data.byteLength > 0) {
                await cacher.saveTile(layer, u, new Blob([data]))
            }
            return data
        } catch {
            return null
        }
    }

    async function fetchExact(u: string): Promise<ArrayBuffer | null> {
        if (hasGoodConnection()) {
            const cachePromise = cacher.loadTile(layer, u)
                .then(blob => blob && new Response(blob).arrayBuffer())
            return firstNonNull([cachePromise, fetchFromNetwork(u)])
        }

        const cached = await cacher.loadTile(layer, u)
        if (cached) return new Response(cached).arrayBuffer()

        return fetchFromNetwork(u)
    }

    const data = isRasterUrl(url)
        ? await loadRasterTileWithFallback(url, fetchExact)
        : await loadVectorTileWithFallback(url, fetchExact)

    return data ? { data } : failed
})
