import { getDistance } from "../utils/distance";
import { getPlaces, type Place } from "./places";

export const closestPlace = (
  lat: number,
  lon: number,
  places: Place[],
  maxDistance: number,
) => {
  let minDistance = -1;
  let closest: Place | undefined;

  for (const place of places) {
    const distance = getDistance(
      lat,
      lon,
      parseFloat(place.lat),
      parseFloat(place.lon),
    );
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

export const findPlace = async (lat: number, lon: number) =>
  closestPlace(lat, lon, await getPlaces(), 0.1);
