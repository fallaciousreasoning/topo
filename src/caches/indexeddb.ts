import Dexie, { Table } from "dexie";
import { Cache, Tile } from "./cache"

class TileDb extends Dexie {
    // @ts-expect-error
    tiles: Table<Tile, string>;

    constructor() {
        super('db')
        this.version(3)
            .stores({
                tiles: 'id,layer'
            });
    }
}

const db = new TileDb()

export default {
    name: 'indexdb',
    loadTile: async (layer, id) => {
        const result = await db.tiles.get(id)
        return result?.data ?? null
    },
    saveTile: async (layer, id, data) => {
        await db.tiles.put({
            id,
            layer,
            data
        }, id)
    },
    getLayerSizes: async () => {
        const result = {}
        await db.tiles.each(t => {
            if (!result[t.layer]) result[t.layer] = 0
            result[t.layer] += t.data.size
        })

        return result
    },
    async clearLayer(layer) {
        const tiles = (await db.tiles.where({ layer }).toArray()).map(t => t.id)
        await db.tiles.bulkDelete(tiles)
    }
} as Cache
