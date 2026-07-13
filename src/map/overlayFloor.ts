// Id of the permanent, invisible marker layer TopoMap.tsx inserts directly
// above the base map and below every overlay layer. An overlay that always
// needs to render at the very bottom of the overlay stack - below every other
// overlay, regardless of what order things were toggled on in - passes this
// as its Layer(s)' beforeId. See TopoMap.tsx and contours.tsx.
export const OVERLAY_FLOOR_ID = 'overlay-floor'
