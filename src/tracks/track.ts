export interface Track {
  id?: number;
  name?: string;
  color?: string;
  tags?: string[];
  coordinates: [number, number][];
  elevations?: {
    percent: number;
    elevation: number;
  }[];
  routedSegments?: Record<string, [number, number][]>;
}
