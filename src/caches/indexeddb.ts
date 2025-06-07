import Dexie, { Table } from "dexie";
import { Cache, Tile } from "./cache";
import { Track } from "../tracks/track";

class TileDb extends Dexie {
  // @ts-expect-error
  tiles: Table<Tile, string>;

  // @ts-expect-error
  tracks: Table<Track, number>;

  constructor() {
    super("db");
    this.version(4).stores({
      tiles: "id,layer",
      tracks: "++id",
    });
  }
}

const db = new TileDb();

export default {
  name: "indexdb",
  loadTile: async (layer, id) => {
    const result = await db.tiles.get(id);
    return result?.data ?? null;
  },
  saveTile: async (layer, id, data) => {
    await db.tiles.put(
      {
        id,
        layer,
        data,
      },
      id,
    );
  },
  getLayerSizes: async () => {
    const result = {};
    await db.tiles.each((t) => {
      if (!result[t.layer]) result[t.layer] = 0;
      result[t.layer] += t.data.size;
    });

    return result;
  },
  async clearLayer(layer) {
    const tiles = (await db.tiles.where({ layer }).toArray()).map((t) => t.id);
    await db.tiles.bulkDelete(tiles);
  },
  async updateTrack(track: Track) {
    const id = await db.tracks.put(track);
    return {
      ...track,
      id,
    };
  },
  async deleteTrack(track: Track) {
    await db.tracks.delete(track.id!);
  },
  async getTracks() {
    return await db.tracks.toArray();
  },
  async getTrack(id: number) {
    return db.tracks.get(id);
  },
};
