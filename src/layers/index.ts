import type Map from "ol/Map";
import { makeClusterLayer } from "./clusterLayer";
import liveWeather from './liveWeather';
import huts from "./huts";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import { Style } from "ol/style";

export interface LayerInfo {
    title: string;
    description: string;
    style?: Style;
}

export const getLayers = async (map: Map) => {
    return [
        await liveWeather.getFeatures().then(features => {
            const source = new VectorSource({ features });

            const layer = new VectorLayer({
                ['title' as any]: liveWeather.name,
                source,
                visible: false,
            });

            map.on('click', event => {
                map.forEachFeatureAtPixel(event.pixel, (feature, clickedLayer) => {
                    if (layer !== clickedLayer) return;
                    liveWeather.onClick(feature);
                })
            });
            return layer;
        })
    ]
}