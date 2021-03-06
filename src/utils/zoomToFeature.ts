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
    map.getView().fit(extent, { duration: 500 });
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
    map.getView().animate({
        center: fromLonLat([result.lon, result.lat]),
        zoom: maxResultZoom,
        duration: 500
    });
}