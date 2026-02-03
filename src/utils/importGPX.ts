import { parseGPXFull, GPXParseResult } from "../tracks/gpxParser";

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
