import type Map from "ol/Map";
import { makeClusterLayer } from "./clusterLayer";
import liveWeather from './liveWeather';
import huts from "./huts";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";

export const getLayers = async (map: Map) => {
    return [
        await makeClusterLayer(map, huts),
        await liveWeather.getFeatures().then(features => {
            const source = new VectorSource({ features });
            return new VectorLayer({
                ['title' as any]: liveWeather.name,
                source,
                visible: true,
            })
        })
    ]
}