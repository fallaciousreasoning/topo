import { Cache } from "./cache";

function parseTileCoords(id: string): { z: string, x: string, y: string, ext: string } | null {
    const match = id.match(/\/(\d+)\/(\d+)\/(\d+)\.([a-z]+)(?:\?|$)/)
    if (!match) return null
    return { z: match[1], x: match[2], y: match[3], ext: match[4] }
}

async function sumDir(dir: FileSystemDirectoryHandle): Promise<number> {
    let size = 0
    for await (const [, entry] of dir.entries()) {
        if (entry.kind === 'file') {
            const file = await (entry as FileSystemFileHandle).getFile()
            size += file.size
        } else {
            size += await sumDir(entry as FileSystemDirectoryHandle)
        }
    }
    return size
}

const opfsCache: Cache = {
    name: 'opfs',

    async loadTile(layer, id) {
        const coords = parseTileCoords(id)
        if (!coords) return null
        try {
            const root = await navigator.storage.getDirectory()
            const tilesDir = await root.getDirectoryHandle('tiles')
            const layerDir = await tilesDir.getDirectoryHandle(layer)
            const zDir = await layerDir.getDirectoryHandle(coords.z)
            const xDir = await zDir.getDirectoryHandle(coords.x)
            const fileHandle = await xDir.getFileHandle(`${coords.y}.${coords.ext}`)
            return await fileHandle.getFile()
        } catch {
            return null
        }
    },

    async saveTile(layer, id, blob) {
        const coords = parseTileCoords(id)
        if (!coords) return
        const root = await navigator.storage.getDirectory()
        const tilesDir = await root.getDirectoryHandle('tiles', { create: true })
        const layerDir = await tilesDir.getDirectoryHandle(layer, { create: true })
        const zDir = await layerDir.getDirectoryHandle(coords.z, { create: true })
        const xDir = await zDir.getDirectoryHandle(coords.x, { create: true })
        const fileHandle = await xDir.getFileHandle(`${coords.y}.${coords.ext}`, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
    },

    async clearLayer(layer) {
        try {
            const root = await navigator.storage.getDirectory()
            const tilesDir = await root.getDirectoryHandle('tiles')
            await tilesDir.removeEntry(layer, { recursive: true })
        } catch {
            // layer or tiles dir doesn't exist, nothing to do
        }
    },

    async getLayerSizes() {
        const result: { [layer: string]: number } = {}
        try {
            const root = await navigator.storage.getDirectory()
            const tilesDir = await root.getDirectoryHandle('tiles')
            for await (const [layerName, entry] of tilesDir.entries()) {
                if (entry.kind === 'directory') {
                    result[layerName] = await sumDir(entry as FileSystemDirectoryHandle)
                }
            }
        } catch {
            // tiles dir doesn't exist yet
        }
        return result
    },
}

export default opfsCache
