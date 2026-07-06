import { Track } from "./track";
import { Point } from "./point";
import { garminColorNameToHex, randomTrackColor } from "../utils/gpxColors";

/**
 * Reads a track/route color from a gpx_style:color or gpxx:DisplayColor
 * extension, if present. Returns undefined if no recognized color extension
 * is found.
 */
function parseTrackColor(el: Element): string | undefined {
  const styleColor = el.getElementsByTagName("gpx_style:color")[0]?.textContent?.trim();
  if (styleColor) return styleColor.startsWith("#") ? styleColor : `#${styleColor}`;

  const displayColor = el.getElementsByTagName("gpxx:DisplayColor")[0]?.textContent?.trim();
  if (displayColor) return garminColorNameToHex(displayColor);

  return undefined;
}

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
    const color = parseTrackColor(trk) ?? randomTrackColor();
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
      tracks.push({ name, color, coordinates });
    }
  });

  // Parse <rte> elements (routes)
  const rteElements = xmlDoc.querySelectorAll("rte");
  rteElements.forEach((rte) => {
    const name = rte.querySelector("name")?.textContent || undefined;
    const color = parseTrackColor(rte) ?? randomTrackColor();
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
      tracks.push({ name, color, coordinates });
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
