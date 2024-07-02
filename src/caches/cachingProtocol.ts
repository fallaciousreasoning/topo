import { addProtocol } from 'maplibre-gl'

const cacherPromise = import('./indexeddb')
const failed = { data: null }

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
        await cacher.saveTile(layer, url, new Blob([buffer]))
        return { data: buffer }
    } catch (err) {
        return { data: null }
    }
})
