// Ids of permanent, invisible marker layers TopoMap.tsx inserts directly
// above the base map, in this fixed bottom-to-top order:
//
//   base map < HILLSHADE_FLOOR_ID < [hillshade] < CONTOUR_FLOOR_ID < [contours] < OVERLAY_FLOOR_ID < [everything else]
//
// An overlay that always needs to render in one of these fixed slots -
// regardless of what order things were toggled on in - passes the anchor
// *above* its own slot as its Layer(s)' beforeId:
//   - hillshade.tsx renders below contours (so shading never dulls the
//     contour lines drawn over it) - pass CONTOUR_FLOOR_ID.
//   - contours.tsx renders above hillshade but below every other overlay -
//     pass OVERLAY_FLOOR_ID.
// Everything else omits beforeId entirely and just appends on top, above
// OVERLAY_FLOOR_ID. See TopoMap.tsx.
export const HILLSHADE_FLOOR_ID = 'hillshade-floor'
export const CONTOUR_FLOOR_ID = 'contour-floor'
export const OVERLAY_FLOOR_ID = 'overlay-floor'
