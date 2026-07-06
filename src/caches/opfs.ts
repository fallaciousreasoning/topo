import { Cache } from "./cache";
import { tileX, tileY } from "../tilebundle";

const isSupported = () => typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function'

function parseTileCoords(id: string): { z: string, x: string, y: string, ext: string } | null {
    const match = id.match(/\/(\d+)\/(\d+)\/(\d+)\.([a-z]+)(?:\?|$)/)
    if (!match) return null
    return { z: match[1], x: match[2], y: match[3], ext: match[4] }
}

// Most tile reads/writes come in runs sharing the same layer/z/x (e.g. extracting a bundle, or
// downloading a viewport column), so caching the last-resolved x-directory handle turns a
// 5-hop OPFS directory walk into a cache hit for every tile after the first in that run.
let cachedXDir: { layer: string, z: string, x: string, handle: FileSystemDirectoryHandle } | null = null

async function getXDir(layer: string, z: string, x: string, create: boolean): Promise<FileSystemDirectoryHandle> {
    if (cachedXDir && cachedXDir.layer === layer && cachedXDir.z === z && cachedXDir.x === x) {
        return cachedXDir.handle
    }
    const root = await navigator.storage.getDirectory()
    const tilesDir = await root.getDirectoryHandle('tiles', { create })
    const layerDir = await tilesDir.getDirectoryHandle(layer, { create })
    const zDir = await layerDir.getDirectoryHandle(z, { create })
    const xDir = await zDir.getDirectoryHandle(x, { create })
    cachedXDir = { layer, z, x, handle: xDir }
    return xDir
}

async function sumDir(dir: FileSystemDirectoryHandle): Promise<number> {
    let size = 0
    for await (const [name, entry] of dir.entries()) {
        try {
            if (entry.kind === 'file') {
                const file = await (await dir.getFileHandle(name)).getFile()
                size += file.size
            } else if (entry.kind === 'directory') {
                size += await sumDir(await dir.getDirectoryHandle(name))
            }
        } catch {
            // skip unreadable entries
        }
    }
    return size
}

const opfsCache: Cache = {
    name: 'opfs',

    async loadTile(layer, id) {
        if (!isSupported()) return null
        const coords = parseTileCoords(id)
        if (!coords) return null
        try {
            const xDir = await getXDir(layer, coords.z, coords.x, false)
            const fileHandle = await xDir.getFileHandle(`${coords.y}.${coords.ext}`)
            return await fileHandle.getFile()
        } catch {
            return null
        }
    },

    async saveTile(layer, id, data) {
        if (!isSupported()) return
        const coords = parseTileCoords(id)
        if (!coords) return
        try {
            const xDir = await getXDir(layer, coords.z, coords.x, true)
            const fileHandle = await xDir.getFileHandle(`${coords.y}.${coords.ext}`, { create: true })
            const writable = await fileHandle.createWritable()
            await writable.write(data)
            await writable.close()
        } catch {
            // OPFS unsupported or write failed, skip caching
        }
    },

    async clearLayer(layer) {
        if (!isSupported()) return
        if (cachedXDir?.layer === layer) cachedXDir = null
        try {
            const root = await navigator.storage.getDirectory()
            const tilesDir = await root.getDirectoryHandle('tiles')
            await tilesDir.removeEntry(layer, { recursive: true })
        } catch {
            // layer or tiles dir doesn't exist, nothing to do
        }
    },

    async deleteTilesInBbox(layer, west, south, east, north) {
        let deleted = 0
        if (!isSupported()) return deleted
        try {
            const root = await navigator.storage.getDirectory()
            const tilesDir = await root.getDirectoryHandle('tiles')
            const layerDir = await tilesDir.getDirectoryHandle(layer)

            for await (const [zStr, zEntry] of layerDir.entries()) {
                if (zEntry.kind !== 'directory') continue
                const z = parseInt(zStr, 10)
                if (isNaN(z)) continue

                const xMin = tileX(west, z)
                const xMax = tileX(east, z)
                const yMin = tileY(north, z) // north → smaller y (y increases southward)
                const yMax = tileY(south, z)

                const zDir = await layerDir.getDirectoryHandle(zStr)
                for await (const [xStr, xEntry] of zDir.entries()) {
                    if (xEntry.kind !== 'directory') continue
                    const x = parseInt(xStr, 10)
                    if (isNaN(x) || x < xMin || x > xMax) continue

                    const xDir = await zDir.getDirectoryHandle(xStr)
                    for await (const [yFile, yEntry] of xDir.entries()) {
                        if (yEntry.kind !== 'file') continue
                        const y = parseInt(yFile, 10)
                        if (isNaN(y) || y < yMin || y > yMax) continue

                        await xDir.removeEntry(yFile)
                        deleted++
                    }
                }
            }
        } catch (e) {
            if (!(e instanceof DOMException && e.name === 'NotFoundError')) {
                console.error('deleteTilesInBbox failed:', e)
            }
        }
        return deleted
    },

    async getSizeInBbox(layer, west, south, east, north) {
        let size = 0
        if (!isSupported()) return size
        try {
            const root = await navigator.storage.getDirectory()
            const tilesDir = await root.getDirectoryHandle('tiles')
            const layerDir = await tilesDir.getDirectoryHandle(layer)

            for await (const [zStr, zEntry] of layerDir.entries()) {
                if (zEntry.kind !== 'directory') continue
                const z = parseInt(zStr, 10)
                if (isNaN(z)) continue

                const xMin = tileX(west, z)
                const xMax = tileX(east, z)
                const yMin = tileY(north, z) // north → smaller y (y increases southward)
                const yMax = tileY(south, z)

                const zDir = await layerDir.getDirectoryHandle(zStr)
                for await (const [xStr, xEntry] of zDir.entries()) {
                    if (xEntry.kind !== 'directory') continue
                    const x = parseInt(xStr, 10)
                    if (isNaN(x) || x < xMin || x > xMax) continue

                    const xDir = await zDir.getDirectoryHandle(xStr)
                    for await (const [yFile, yEntry] of xDir.entries()) {
                        if (yEntry.kind !== 'file') continue
                        const y = parseInt(yFile, 10)
                        if (isNaN(y) || y < yMin || y > yMax) continue

                        const file = await (await xDir.getFileHandle(yFile)).getFile()
                        size += file.size
                    }
                }
            }
        } catch (e) {
            if (!(e instanceof DOMException && e.name === 'NotFoundError')) {
                console.error('getSizeInBbox failed:', e)
            }
        }
        return size
    },

    async getLayerSizes() {
        const result: { [layer: string]: number } = {}
        if (!isSupported()) return result
        try {
            const root = await navigator.storage.getDirectory()
            const tilesDir = await root.getDirectoryHandle('tiles')
            for await (const [layerName, entry] of tilesDir.entries()) {
                if (entry.kind === 'directory') {
                    result[layerName] = await sumDir(await tilesDir.getDirectoryHandle(layerName))
                }
            }
        } catch (e) {
            if (e instanceof DOMException && e.name === 'NotFoundError') {
                // tiles dir doesn't exist yet
            } else {
                console.error('getLayerSizes failed:', e)
            }
        }
        return result
    },
}

export default opfsCache
