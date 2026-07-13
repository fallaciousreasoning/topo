import { getDistance, distanceToGeometry } from "../utils/distance";
import { getPlaces, type Place } from "./places";
import db from "../caches/indexeddb";

export const closestPlace = (
  lat: number,
  lon: number,
  places: Place[],
  maxDistance: number,
) => {
  let minDistance = -1;
  let closest: Place | undefined;

  for (const place of places) {
    // Places with real line/polygon geometry (see src/search/places.ts) are
    // measured against their actual shape - 0 if lat/lon falls inside a
    // polygon, or the distance to the nearest edge/point otherwise - rather
    // than against a bbox-centre point that can be well away from the shape
    // itself for an irregular feature (e.g. a dogleg lake).
    const distance = place.geometry
      ? distanceToGeometry(lat, lon, place.geometry)
      : getDistance(lat, lon, parseFloat(place.lat), parseFloat(place.lon));
    if (distance < minDistance || !closest) {
      minDistance = distance;
      closest = place;
    }
  }

  if (minDistance < maxDistance) {
    return closest;
  }
  return undefined;
};

export const findPlace = async (lat: number, lon: number) => {
  // First check saved points
  const savedPoints = await db.getPoints();
  const savedPlaces: Place[] = savedPoints.map(point => ({
    name: point.name ?? `Point ${point.id}`,
    lat: point.coordinates[1].toString(),
    lon: point.coordinates[0].toString(),
    type: 'point'
  }));

  const closestSavedPoint = closestPlace(lat, lon, savedPlaces, 0.1);
  if (closestSavedPoint) {
    return closestSavedPoint;
  }

  // Fall back to other places
  return closestPlace(lat, lon, await getPlaces(), 0.1);
};
