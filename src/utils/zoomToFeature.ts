import type Map from "ol/Map";
import type { FeatureLike } from "ol/Feature";
import { extend, createEmpty, boundingExtent } from "ol/extent";
import type { GeocodeResult } from "../search/geocode";
import { fromLonLat } from "ol/proj";
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

export const zoomToGeocodeResult = (map: Map, result: GeocodeResult, maxResultZoom=14) => {
    const points = result.boundingbox.map(b => parseFloat(b as any));
    const min = fromLonLat([points[2], points[0]]);
    const max = fromLonLat([points[3], points[1]]);
    const extent = boundingExtent([min, max]);

    map.getView().fit(extent);
    if (map.getView().getZoom() > maxResultZoom)
        map.getView().setZoom(maxResultZoom);
}