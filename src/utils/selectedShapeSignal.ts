import * as React from 'react';

interface Selection {
  lat: number;
  lon: number;
  geometry: GeoJSON.Geometry;
}

const listeners = new Set<() => void>();
let _selection: Selection | null = null;

/** The real line/polygon geometry of whatever was last selected (currently
 * just search results with shape data - see SearchSection.tsx), tagged with
 * the coordinate it was selected at. Consumed via useMatchingSelectedShape,
 * which only returns it while still viewing that same location - navigating
 * to a different feature (clicking a hut, searching something else, ...)
 * stops it matching and it stops being used, rather than needing every other
 * navigation path in the app to remember to clear it. */
export function setSelectedShape(lat: number, lon: number, geometry: GeoJSON.Geometry | null) {
  _selection = geometry ? { lat, lon, geometry } : null;
  listeners.forEach(fn => fn());
}

/** The selected shape's geometry, but only if (lat, lon) is still the same
 * location it was selected at - null once the view has moved on to
 * something else. Used both to draw the highlight (SelectedShapeHighlight)
 * and to suppress the plain pin for it (MapLabel), so a shaped result shows
 * only the outline, not pin-plus-outline. */
export function useMatchingSelectedShape(lat: number | null, lon: number | null): GeoJSON.Geometry | null {
  const [, rerender] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, []);

  if (!_selection || lat === null || lon === null) return null;
  const matches = Math.abs(_selection.lat - lat) < 1e-6 && Math.abs(_selection.lon - lon) < 1e-6;
  return matches ? _selection.geometry : null;
}
