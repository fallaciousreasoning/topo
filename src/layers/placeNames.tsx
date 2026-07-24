import * as React from "react";
import type { OverlayDefinition } from "./config";
import ridges from "./ridges";
import glaciers from "./glaciers";
import valleys from "./valleys";
import waterways from "./waterways";
import landforms from "./landforms";
import waterFeatures from "./waterFeatures";
import geologicalFeatures from "./geologicalFeatures";
import localities from "./localities";
import protectedAreas from "./protectedAreas";

// These were each their own separate overlay/checkbox before - collapsed
// into one "Place Names" entry since they're all the same kind of thing (a
// named-feature label layer, sourced from one of the public/data/*.json
// datasets documented in public/data/README.md) and nine near-identical
// checkboxes for "some more named things" was more clutter than choice.
// Each one keeps fetching and rendering its own data completely
// independently - this only merges the single on/off toggle, not the
// underlying data/rendering.
const NAME_LAYERS: OverlayDefinition[] = [
    ridges,
    glaciers,
    valleys,
    waterways,
    landforms,
    waterFeatures,
    geologicalFeatures,
    localities,
    protectedAreas,
]

export default {
    id: 'placeNames',
    name: 'Place Names',
    description: 'Named ridges, ranges, glaciers, valleys, rivers, streams, cliffs, bays, saddles, islands, lakes, waterfalls, springs, volcanoes, caves, localities, reserves and parks',
    type: 'overlay',
    cacheable: false,
    source: () => <>
        {NAME_LAYERS.map(layer => {
            const Source = layer.source
            return <React.Fragment key={layer.id}>
                {typeof Source === 'function' ? <Source /> : Source}
            </React.Fragment>
        })}
    </>,
} as OverlayDefinition
