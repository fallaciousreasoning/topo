import { addProtocol } from './protocols'
import { isCacheEnabled } from './cachingProtocol'
import type { CompositeRequest, CompositeResponse } from './compositeWorker'

const failed = { data: null }

const PROTOCOL = 'composite-layer'

// protocol:
// composite-layer://color-burn?alpha=0.5&url=${encodeURIComponent(url1)}&url=${encodeURIComponent(url2)}
export const createCompositeLayer = (blendMode: GlobalCompositeOperation, overlayAlpha: number, ...urls: string[]) => {
    return `${PROTOCOL}://${blendMode}?alpha=${overlayAlpha}&${urls.map(u => `url=${encodeURIComponent(u)}`).join('&')}`
        .replaceAll('%7Bz%7D', '{z}')
        .replaceAll('%7Bx%7D', '{x}')
        .replaceAll('%7By%7D', '{y}')
}

// The fetch + canvas compositing work all happens in compositeWorker.ts, off the main
// thread. This is a plain actor pattern (request/response correlated by id), the same
// approach slopeAngle.tsx uses for its worker.
let worker: Worker | undefined
const pending = new Map<string, (data: ArrayBuffer | null) => void>()

function getWorker(): Worker {
    if (!worker) {
        worker = new Worker(new URL('./compositeWorker.ts', import.meta.url), { type: 'module' })
        worker.addEventListener('message', (event: MessageEvent<CompositeResponse>) => {
            const { id, data } = event.data
            const resolve = pending.get(id)
            if (!resolve) return
            pending.delete(id)
            resolve(data)
        })
    }
    return worker
}

let nextId = 0

addProtocol(PROTOCOL, async (params, abortController) => {
    const [blendMode, searchParamsRaw] = params.url.split('://')[1].split('?')
    const searchParams = new URLSearchParams(searchParamsRaw)
    const urls = searchParams.getAll('url')
    const alpha = parseFloat(searchParams.get('alpha') ?? '1')

    const id = `${Date.now()}-${nextId++}`
    const w = getWorker()

    const { promise, resolve } = Promise.withResolvers<ArrayBuffer | null>()
    pending.set(id, resolve)

    const onAbort = () => {
        w.postMessage({ type: 'ABORT_TILE', id })
        if (pending.delete(id)) resolve(null)
    }
    abortController.signal.addEventListener('abort', onAbort)

    const request: CompositeRequest = {
        type: 'COMPOSITE_TILE',
        id,
        blendMode: blendMode as GlobalCompositeOperation,
        alpha,
        urls,
        cacheFlags: urls.map(u => {
            const layer = u.split('#')[1]
            return layer ? isCacheEnabled(layer) : false
        }),
    }
    w.postMessage(request)

    const data = await promise
    abortController.signal.removeEventListener('abort', onAbort)
    return data ? { data } : failed
})
