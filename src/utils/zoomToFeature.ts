import type Map from "ol/Map";
import type { FeatureLike } from "ol/Feature";
import { extend, createEmpty } from "ol/extent";
export const zoomToFeature = (map: Map, feature:FeatureLike) => {
    let extent = createEmpty();

    const subfeatures = feature.get('features');
    if (subfeatures) {
        for (const f of subfeatures)
            extent = extend(extent, f.getGeometry().getExtent());
    }
    map.getView().fit(extent);
}

export const enableZoomToCluster = (map: Map) =>
    map.on('click', e => {
        const feature = map
            .forEachFeatureAtPixel(e.pixel, feature => {
                const subfeatures = feature.get('features');
                if (!subfeatures || subfeatures.length <= 1)
                    return;
                return feature;
            });

        if (feature)
            zoomToFeature(map, feature);
    });