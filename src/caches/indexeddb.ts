import Dexie, { Table } from "dexie";
import { Track } from "../tracks/track";
import { Point } from "../tracks/point";

class TileDb extends Dexie {
  // @ts-expect-error
  tracks: Table<Track, number>;

  // @ts-expect-error
  points: Table<Point, number>;

  constructor() {
    super("database");

    this.version(4).stores({
      tiles: "id,layer",
      tracks: "++id",
    })

    this.version(5).stores({
      tiles: "id,layer",
      tracks: "++id",
      points: "++id,*tags",
    });

    this.version(6).stores({
      tiles: null,
      tracks: "++id",
      points: "++id,*tags",
    });
  }
}

const db = new TileDb();

export default {
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
  async updatePoint(point: Point) {
    const id = await db.points.put(point);
    return {
      ...point,
      id,
    };
  },
  async deletePoint(point: Point) {
    await db.points.delete(point.id!);
  },
  async getPoints() {
    return await db.points.toArray();
  },
  async getPoint(id: number) {
    return db.points.get(id);
  },
  async getPointsByTag(tag: string) {
    return await db.points.where("tags").equals(tag).toArray();
  },
  async findPointByCoordinates(lng: number, lat: number, tolerance = 0.0001) {
    // Find a point within tolerance distance (roughly ~10 meters)
    const points = await db.points.toArray();
    return points.find((p) => {
      const [pLng, pLat] = p.coordinates;
      return (
        Math.abs(pLng - lng) < tolerance && Math.abs(pLat - lat) < tolerance
      );
    });
  },
};
