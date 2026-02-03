import { Track } from "./track";
import { Point } from "./point";

export interface GPXParseResult {
  tracks: Track[];
  points: Point[];
}

/**
 * Parses a GPX file and extracts tracks
 * @param gpxText The GPX file content as text
 * @returns Array of Track objects
 */
export function parseGPX(gpxText: string): Track[] {
  return parseGPXFull(gpxText).tracks;
}

/**
 * Parses a GPX file and extracts both tracks and waypoints
 * @param gpxText The GPX file content as text
 * @returns Object containing tracks and points arrays
 */
export function parseGPXFull(gpxText: string): GPXParseResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxText, "text/xml");

  // Check for parse errors
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid GPX file");
  }

  const tracks: Track[] = [];

  // Parse <trk> elements (tracks)
  const trkElements = xmlDoc.querySelectorAll("trk");
  trkElements.forEach((trk) => {
    const name = trk.querySelector("name")?.textContent || undefined;
    const coordinates: [number, number][] = [];

    // Get all track points from all track segments
    const trkpts = trk.querySelectorAll("trkpt");
    trkpts.forEach((trkpt) => {
      const lat = parseFloat(trkpt.getAttribute("lat") || "0");
      const lon = parseFloat(trkpt.getAttribute("lon") || "0");
      if (!isNaN(lat) && !isNaN(lon)) {
        coordinates.push([lon, lat]); // GeoJSON format: [lng, lat]
      }
    });

    if (coordinates.length > 0) {
      tracks.push({ name, coordinates });
    }
  });

  // Parse <rte> elements (routes)
  const rteElements = xmlDoc.querySelectorAll("rte");
  rteElements.forEach((rte) => {
    const name = rte.querySelector("name")?.textContent || undefined;
    const coordinates: [number, number][] = [];

    // Get all route points
    const rtepts = rte.querySelectorAll("rtept");
    rtepts.forEach((rtept) => {
      const lat = parseFloat(rtept.getAttribute("lat") || "0");
      const lon = parseFloat(rtept.getAttribute("lon") || "0");
      if (!isNaN(lat) && !isNaN(lon)) {
        coordinates.push([lon, lat]); // GeoJSON format: [lng, lat]
      }
    });

    if (coordinates.length > 0) {
      tracks.push({ name, coordinates });
    }
  });

  // Parse <wpt> elements (waypoints/points)
  const points: Point[] = [];
  const wptElements = xmlDoc.querySelectorAll("wpt");
  wptElements.forEach((wpt) => {
    const lat = parseFloat(wpt.getAttribute("lat") || "0");
    const lon = parseFloat(wpt.getAttribute("lon") || "0");

    if (!isNaN(lat) && !isNaN(lon)) {
      const name = wpt.querySelector("name")?.textContent || undefined;
      const description = wpt.querySelector("desc")?.textContent || undefined;

      // Extract type as a tag if present
      const type = wpt.querySelector("type")?.textContent;
      const tags = type ? [type] : [];

      points.push({
        name,
        coordinates: [lon, lat], // GeoJSON format: [lng, lat]
        tags,
        description,
        color: "#3b82f6",
      });
    }
  });

  if (tracks.length === 0 && points.length === 0) {
    throw new Error("No tracks, routes, or waypoints found in GPX file");
  }

  return { tracks, points };
}
