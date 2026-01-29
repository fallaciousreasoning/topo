export interface Point {
  id?: number;
  name?: string;
  coordinates: [number, number]; // [lng, lat]
  tags: string[]; // Tags function like folders
  description?: string;
  color?: string; // Hex color for the point marker
}
