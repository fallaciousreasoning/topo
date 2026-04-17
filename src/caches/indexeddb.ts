import Dexie, { Table } from "dexie";
import { Track } from "../tracks/track";
import { Point } from "../tracks/point";

export interface Download {
  id?: number
  /** Matches a Region.id for preconfigured regions; null for user-defined rectangular downloads. */
  regionId: string | null
  layerId: string
  minZoom: number
  maxZoom: number
  /** Closed [lng, lat] ring representing the download bounds. */
  polygon: [number, number][]
  status: 'downloading' | 'complete' | 'error'
  /** Overall progress 0–1, updated periodically during a download. */
  progress: number
  tilesDownloaded: number
  error?: string
}

class TileDb extends Dexie {
  tracks!: Table<Track, number>;
  points!: Table<Point, number>;
  downloads!: Table<Download, number>;

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

    this.version(7).stores({
      downloads: "++id,regionId,layerId",
    });
  }
}

const db = new TileDb();

export default {
  async updateDownload(download: Download) {
    const id = await db.downloads.put(download);
    return { ...download, id };
  },
  async deleteDownload(download: Download) {
    await db.downloads.delete(download.id!);
  },
  async getDownloads() {
    return db.downloads.toArray();
  },
  async getDownload(regionId: string, layerId: string) {
    return db.downloads.where('regionId').equals(regionId).and(d => d.layerId === layerId).first();
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
