// Main-thread client for vectorClipWorker.ts. Plain actor pattern (request/response
// correlated by id), the same approach compositeProtocol.ts uses for compositeWorker.ts.
import type { ClipRequest, ClipResponse } from './vectorClipWorker'

let worker: Worker | undefined
const pending = new Map<string, (data: ArrayBuffer | null) => void>()

function getWorker(): Worker {
    if (!worker) {
        worker = new Worker(new URL('./vectorClipWorker.ts', import.meta.url), { type: 'module' })
        worker.addEventListener('message', (event: MessageEvent<ClipResponse>) => {
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

/** Clips `data` (an encoded MVT tile) to one quadrant and rescales it to a full tile. */
export function clipVectorQuadrant(data: ArrayBuffer, right: boolean, bottom: boolean): Promise<ArrayBuffer | null> {
    const id = `${Date.now()}-${nextId++}`
    const w = getWorker()

    const { promise, resolve } = Promise.withResolvers<ArrayBuffer | null>()
    pending.set(id, resolve)

    // Don't transfer `data`: it comes from fetchExact, and the same underlying tile URL can be
    // in flight for other consumers at once (e.g. maplibre-contour's glacier lookup in
    // contours.tsx fetches this exact tile family too, via its own worker-to-main-thread proxy,
    // which transfers the buffer our protocol handler returns). We can't assume we're the only
    // one holding a reference to it, so structured-clone (copy) it into the worker instead of
    // transferring - it's a rare fallback path, the copy cost doesn't matter.
    const request: ClipRequest = { type: 'CLIP_QUADRANT', id, data, right, bottom }
    w.postMessage(request)

    return promise
}
