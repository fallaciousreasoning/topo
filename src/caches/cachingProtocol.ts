import { addProtocol, getData } from './protocols'
import { getSetting, addListener as addSettingsListener } from '../utils/settings'

interface NetworkInformation {
    saveData: boolean,
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g',
}

export const cacherPromise = import('./opfs')
const failed = { data: null }

let cacheLayers = new Set<string>(getSetting('cacheLayers'))

addSettingsListener(key => {
    if (key !== 'cacheLayers') return
    cacheLayers = new Set(getSetting('cacheLayers'))
})

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

    async function fetchFromNetwork(): Promise<ArrayBuffer | null> {
        try {
            const { data } = await getData({ ...params, url: 'https://' + url }, abortController)
            if (cacheLayers.has(layer)) {
                await cacher.saveTile(layer, url, new Blob([data]))
            }
            return data
        } catch {
            return null
        }
    }

    if (hasGoodConnection()) {
        const cachePromise = cacher.loadTile(layer, url)
            .then(blob => blob && new Response(blob).arrayBuffer())
        const data = await firstNonNull([cachePromise, fetchFromNetwork()])
        return data ? { data } : failed
    }

    const cached = await cacher.loadTile(layer, url)

    if (cached) {
        return { data: await new Response(cached).arrayBuffer() }
    }

    const data = await fetchFromNetwork()
    return data ? { data } : failed
})
