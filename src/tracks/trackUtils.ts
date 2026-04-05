import { Track } from './track';
import { getDistance } from '../utils/distance';

/** Build a flat coordinate array, substituting routed segment coords where available. */
export function buildFullCoordinates(track: Track): [number, number][] {
  const coords = track.coordinates as [number, number][];
  if (coords.length < 2 || !track.routedSegments) return coords;
  const full: [number, number][] = [coords[0]];
  for (let i = 0; i < coords.length - 1; i++) {
    const key = `${coords[i][0]},${coords[i][1]}:${coords[i + 1][0]},${coords[i + 1][1]}`;
    const routed = track.routedSegments[key];
    if (routed && routed.length > 1) {
      full.push(...routed.slice(1) as [number, number][]);
    } else {
      full.push(coords[i + 1]);
    }
  }
  return full;
}

/** Sample a coordinate array at regular metre intervals. */
export function generateSamplePoints(
  coordinates: [number, number][],
  intervalMetres = 20,
): { coord: [number, number]; distance: number }[] {
  if (coordinates.length === 0) return [];

  const segments: { start: [number, number]; end: [number, number]; startDistance: number; endDistance: number }[] = [];
  let totalDistance = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const start = coordinates[i - 1];
    const end = coordinates[i];
    const segmentDistance = getDistance(start[1], start[0], end[1], end[0]) * 1000;
    segments.push({ start, end, startDistance: totalDistance, endDistance: totalDistance + segmentDistance });
    totalDistance += segmentDistance;
  }

  const samplePoints: { coord: [number, number]; distance: number }[] = [];
  samplePoints.push({ coord: coordinates[0], distance: 0 });

  for (let distance = intervalMetres; distance < totalDistance; distance += intervalMetres) {
    const segment = segments.find(s => distance >= s.startDistance && distance <= s.endDistance);
    if (!segment) continue;
    const t = (distance - segment.startDistance) / (segment.endDistance - segment.startDistance);
    samplePoints.push({
      coord: [
        segment.start[0] + (segment.end[0] - segment.start[0]) * t,
        segment.start[1] + (segment.end[1] - segment.start[1]) * t,
      ],
      distance,
    });
  }

  if (coordinates.length > 1) {
    const last = coordinates[coordinates.length - 1];
    samplePoints.push({ coord: last, distance: totalDistance });
  }

  return samplePoints;
}
