// Main-thread client for opfsWriteWorker.ts. Same request/response-by-id actor pattern as
// vectorClipProtocol.ts / compositeProtocol.ts.
import type { SaveTileRequest, SaveTileResponse } from './opfsWriteWorker'

let worker: Worker | undefined
const pending = new Map<string, () => void>()

function getWorker(): Worker {
    if (!worker) {
        worker = new Worker(new URL('./opfsWriteWorker.ts', import.meta.url), { type: 'module' })
        worker.addEventListener('message', (event: MessageEvent<SaveTileResponse>) => {
            const { id } = event.data
            const resolve = pending.get(id)
            if (!resolve) return
            pending.delete(id)
            resolve()
        })
    }
    return worker
}

let nextId = 0

/**
 * Save a tile via the write worker's fast FileSystemSyncAccessHandle path. Never rejects - a
 * failed write (unsupported browser, OPFS error) is swallowed, same "best effort" contract as
 * the rest of the tile cache.
 */
export function saveTileViaWorker(layer: string, path: string, data: Uint8Array): Promise<void> {
    const id = `${Date.now()}-${nextId++}`
    const w = getWorker()

    const { promise, resolve } = Promise.withResolvers<void>()
    pending.set(id, resolve)

    // Structured-clone (copy) `data` rather than transferring it: a bundle download's tiles are
    // often subarray views over one shared backing buffer (see tilebundle/index.ts's
    // parseTileStream), so transferring one tile's view would detach the whole buffer out from
    // under any sibling tile views still pending a write.
    const request: SaveTileRequest = { type: 'SAVE_TILE', id, layer, path, data }
    w.postMessage(request)

    return promise
}
