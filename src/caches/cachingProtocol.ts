import { addProtocol } from './protocols'
import { getSetting, addListener as addSettingsListener } from '../utils/settings'

export const cacherPromise = import('./indexeddb')
const failed = { data: null }

let cacheLayers = new Set<string>(getSetting('cacheLayers'))

addSettingsListener(key => {
    if (key !== 'cacheLayers') return
    cacheLayers = new Set(getSetting('cacheLayers'))
})

addProtocol('maybe-cache', async (params, abortController) => {
    const [url, layer] = params.url.split('://')[1]
    .split('#')

    const cacher = await cacherPromise.then(r => r.default)

    const data = await cacher.loadTile(layer, url)

    if (data) {
        return { data: await new Response(data).arrayBuffer() }
    }

    try {
        const buffer = await fetch('https://' + url).then(r => r.arrayBuffer())
        if (cacheLayers.has(layer)) {
            await cacher.saveTile(layer, url, new Blob([buffer]))
        }
        return { data: buffer }
    } catch (err) {
        return failed
    }
})
