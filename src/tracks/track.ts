export interface Track {
  id?: number;
  name?: string;
  coordinates: [number, number][];
  elevations?: {
    percent: number;
    elevation: number;
  }[];
}
