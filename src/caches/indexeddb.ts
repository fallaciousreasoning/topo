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
    }
} as Cache
