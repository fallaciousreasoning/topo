import { boundingExtent } from "ol/extent";
import { fromLonLat } from "ol/proj";

export const nzBounds = boundingExtent([
    fromLonLat([165.9,
        -47.9]),
    fromLonLat([179.0,
        -34.0])
]);