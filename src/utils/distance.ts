const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
export const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const r = 6371.0; // radius of the earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const lLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(lLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return r * c;
};

export const getLineLength = (coords: [number, number][]) => {
  let previous = coords[0];
  let distance = 0;

  for (let i = 1; i < coords.length; i++) {
    const current = coords[i];
    distance += getDistance(previous[1], previous[0], current[1], current[0]);
    previous = current;
  }

  return distance;
};

/**
 * The point halfway along a line's length (not just its middle vertex, which
 * can be skewed by uneven vertex spacing, and not a bbox centre, which for a
 * bent/hooked line - a ridge doubling back on itself, say - can land well
 * away from the line entirely). Walks the line accumulating segment lengths
 * until the halfway point falls within a segment, then interpolates linearly
 * within it.
 */
export const getLineMidpoint = (coords: [number, number][]): [number, number] => {
  if (coords.length === 1) return coords[0];

  const totalLength = getLineLength(coords);
  if (totalLength === 0) return coords[0];

  let remaining = totalLength / 2;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    const segmentLength = getDistance(lat1, lon1, lat2, lon2);
    if (remaining <= segmentLength) {
      const t = segmentLength === 0 ? 0 : remaining / segmentLength;
      return [lon1 + (lon2 - lon1) * t, lat1 + (lat2 - lat1) * t];
    }
    remaining -= segmentLength;
  }
  return coords[coords.length - 1];
};

/** Standard ray-casting point-in-polygon test, on a single (outer) ring. */
export const isPointInRing = (lat: number, lon: number, ring: GeoJSON.Position[]): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

/**
 * Distance (km) from a point to the nearest point on a line segment, via a
 * local equirectangular projection (cos(lat) scaling) - accurate enough at
 * the sub-feature scale this is used at (a few km at most), same style of
 * approximation as scripts/polygon_shape.py's project_ring.
 */
const distanceToSegmentKm = (
  lat: number, lon: number,
  [lonA, latA]: GeoJSON.Position, [lonB, latB]: GeoJSON.Position,
): number => {
  const kmPerDegreeLon = 111.32 * Math.cos(toRadians(latA));
  const kmPerDegreeLat = 110.57;
  const toXY = (lo: number, la: number): [number, number] => [(lo - lonA) * kmPerDegreeLon, (la - latA) * kmPerDegreeLat];

  const [px, py] = toXY(lon, lat);
  const [bx, by] = toXY(lonB, latB);
  const lengthSq = bx * bx + by * by;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / lengthSq));
  return Math.hypot(px - t * bx, py - t * by);
};

/** Distance (km) from a point to the nearest segment of a line/ring. */
const distanceToLineKm = (lat: number, lon: number, coords: GeoJSON.Position[]): number => {
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    min = Math.min(min, distanceToSegmentKm(lat, lon, coords[i], coords[i + 1]));
  }
  return min;
};

/**
 * Distance (km) from a point to a GeoJSON geometry - 0 if the point is
 * inside a Polygon, otherwise the distance to the nearest edge/point.
 * Used so "closest place" can recognise a click landing *inside* a lake or
 * park polygon, or right on a ridge line, rather than only ever comparing
 * against a single representative point per place.
 */
export const distanceToGeometry = (lat: number, lon: number, geometry: GeoJSON.Geometry): number => {
  switch (geometry.type) {
    case 'Point':
      return getDistance(lat, lon, geometry.coordinates[1], geometry.coordinates[0]);
    case 'LineString':
      return distanceToLineKm(lat, lon, geometry.coordinates);
    case 'Polygon': {
      const ring = geometry.coordinates[0];
      return isPointInRing(lat, lon, ring) ? 0 : distanceToLineKm(lat, lon, ring);
    }
    case 'MultiPolygon':
      return Math.min(...geometry.coordinates.map(([ring]) =>
        isPointInRing(lat, lon, ring) ? 0 : distanceToLineKm(lat, lon, ring)));
    case 'MultiLineString':
      return Math.min(...geometry.coordinates.map(line => distanceToLineKm(lat, lon, line)));
    default:
      return Infinity;
  }
};
