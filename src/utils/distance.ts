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
