// Web Worker: fetches the topo + hillshade tile images and composites them, off the
// main thread. Mirrors the fetch/cache-race logic that used to live inline in
// compositeProtocol.ts (see cachingProtocol.ts for the main-thread equivalent used by
// other layers), but can't reuse that module directly because it pulls in
// localStorage-backed settings and layer definitions that don't exist in a worker.

const cacherPromise = import('./opfs')

export interface CompositeRequest {
    type: 'COMPOSITE_TILE'
    id: string
    blendMode: GlobalCompositeOperation
    alpha: number
    urls: string[]
    /** Parallel to `urls`: whether the app cache is enabled for that url's layer. */
    cacheFlags: boolean[]
}

export interface AbortRequest {
    type: 'ABORT_TILE'
    id: string
}

export interface CompositeResponse {
    type: 'COMPOSITE_COMPLETE'
    id: string
    data: ArrayBuffer | null
}

// Races a set of promises and resolves with the first non-null value, or null once all
// of them have settled without producing one. (Same behaviour as cachingProtocol.ts.)
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

async function fetchTile(url: string, shouldCache: boolean, signal: AbortSignal): Promise<ArrayBuffer | null> {
    if (url.startsWith('maybe-cache://')) {
        const [hostPathAndQuery, layer] = url.slice('maybe-cache://'.length).split('#')
        const cacher = await cacherPromise.then(r => r.default)

        const fetchFromNetwork = async (): Promise<ArrayBuffer | null> => {
            try {
                const res = await fetch('https://' + hostPathAndQuery, { signal })
                const data = await res.arrayBuffer()
                if (shouldCache && layer) cacher.saveTile(layer, hostPathAndQuery, new Blob([data]))
                return data
            } catch {
                return null
            }
        }

        const cachePromise = cacher.loadTile(layer, hostPathAndQuery)
            .then(blob => blob && new Response(blob).arrayBuffer())

        return firstNonNull([cachePromise, fetchFromNetwork()])
    }

    try {
        const res = await fetch(url, { signal })
        return await res.arrayBuffer()
    } catch {
        return null
    }
}

const controllers = new Map<string, AbortController>()

self.addEventListener('message', async (event: MessageEvent<CompositeRequest | AbortRequest>) => {
    const message = event.data

    if (message.type === 'ABORT_TILE') {
        controllers.get(message.id)?.abort()
        controllers.delete(message.id)
        return
    }

    const { id, blendMode, alpha, urls, cacheFlags } = message
    const controller = new AbortController()
    controllers.set(id, controller)

    const respond = (data: ArrayBuffer | null) => {
        controllers.delete(id)
        const response: CompositeResponse = { type: 'COMPOSITE_COMPLETE', id, data }
        if (data) {
            self.postMessage(response, [data])
        } else {
            self.postMessage(response)
        }
    }

    try {
        const activeUrls = alpha === 0 ? urls.slice(0, 1) : urls
        const buffers = await Promise.all(activeUrls.map((u, i) => fetchTile(u, cacheFlags[i], controller.signal)))

        if (controller.signal.aborted) return

        const canvas = new OffscreenCanvas(256, 256)
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        for (let i = 0; i < buffers.length; i++) {
            const buffer = buffers[i]
            if (!buffer) continue
            const bitmap = await createImageBitmap(new Blob([buffer]))
            if (i === 0) {
                ctx.globalCompositeOperation = 'source-over'
                ctx.globalAlpha = 1
            } else {
                ctx.globalCompositeOperation = blendMode
                ctx.globalAlpha = alpha
            }
            ctx.drawImage(bitmap, 0, 0)
            bitmap.close()
        }

        if (controller.signal.aborted) return

        const blob = await canvas.convertToBlob()
        respond(await blob.arrayBuffer())
    } catch {
        if (!controller.signal.aborted) respond(null)
    }
})
