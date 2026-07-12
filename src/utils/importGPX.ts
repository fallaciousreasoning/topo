import { parseGPXFull, GPXParseResult } from "../tracks/gpxParser";
import db from "../caches/indexeddb";

/**
 * Imports tracks and points from a GPX file
 * @param file The GPX file to import
 * @returns Object containing arrays of Track and Point objects
 * @throws Error if the file cannot be read or parsed
 */
export async function importGPXFile(file: File): Promise<GPXParseResult> {
  const text = await file.text();
  return parseGPXFull(text);
}

/**
 * Imports a GPX file and persists the resulting tracks/points to the database.
 * @returns A human readable summary of what was imported, e.g. "2 track(s) and 1 point(s)"
 */
export async function importAndSaveGPXFile(file: File): Promise<string> {
  const result = await importGPXFile(file);
  for (const track of result.tracks) await db.updateTrack(track);
  for (const point of result.points) await db.updatePoint(point);

  const parts = [];
  if (result.tracks.length > 0) parts.push(`${result.tracks.length} track(s)`);
  if (result.points.length > 0) parts.push(`${result.points.length} point(s)`);
  return parts.join(' and ');
}
