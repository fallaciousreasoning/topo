// Web Worker: writes tiles into OPFS via FileSystemSyncAccessHandle, the fast synchronous
// file-write API that's only available inside a Worker (not the main thread). The main thread's
// equivalent, createWritable(), goes through a swap-file/atomic-rename dance on every write -
// fine for the occasional live-tile cache write, but writing hundreds of thousands of tiles
// during a bundle download this way was measured (via a real CPU profile) to burn ~20% of the
// main thread's time in write()/createWritable()/close(), on top of blocking it from staying
// responsive. Routing those same writes through this worker's sync access handles instead is
// both much cheaper in aggregate and keeps the main thread free.
import { parseTileCoords } from './tileCoords'

export interface SaveTileRequest {
    type: 'SAVE_TILE'
    id: string
    layer: string
    path: string
    data: Uint8Array
}

export interface SaveTileResponse {
    type: 'SAVE_TILE_DONE'
    id: string
    ok: boolean
}

// Mirrors opfs.ts's cachedXDir: most writes come in runs sharing the same layer/z/x (extracting
// a bundle, or downloading a viewport column), so caching the last-resolved x-directory handle
// turns a multi-hop OPFS directory walk into a cache hit for every tile after the first in that run.
let cachedXDir: { layer: string, z: string, x: string, handle: FileSystemDirectoryHandle } | null = null

async function getXDir(layer: string, z: string, x: string): Promise<FileSystemDirectoryHandle> {
    if (cachedXDir && cachedXDir.layer === layer && cachedXDir.z === z && cachedXDir.x === x) {
        return cachedXDir.handle
    }
    const root = await navigator.storage.getDirectory()
    const tilesDir = await root.getDirectoryHandle('tiles', { create: true })
    const layerDir = await tilesDir.getDirectoryHandle(layer, { create: true })
    const zDir = await layerDir.getDirectoryHandle(z, { create: true })
    const xDir = await zDir.getDirectoryHandle(x, { create: true })
    cachedXDir = { layer, z, x, handle: xDir }
    return xDir
}

async function saveTile(layer: string, path: string, data: Uint8Array): Promise<boolean> {
    const coords = parseTileCoords(path)
    if (!coords) return false
    try {
        const xDir = await getXDir(layer, coords.z, coords.x)
        const fileHandle = await xDir.getFileHandle(`${coords.y}.${coords.ext}`, { create: true })
        const accessHandle = await (fileHandle as any).createSyncAccessHandle()
        try {
            accessHandle.write(data, { at: 0 })
            accessHandle.truncate(data.byteLength)
            accessHandle.flush()
        } finally {
            accessHandle.close()
        }
        return true
    } catch {
        return false
    }
}

self.addEventListener('message', (event: MessageEvent<SaveTileRequest>) => {
    const { id, layer, path, data } = event.data
    saveTile(layer, path, data).then(ok => {
        const response: SaveTileResponse = { type: 'SAVE_TILE_DONE', id, ok }
        self.postMessage(response)
    })
})
