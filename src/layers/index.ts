import VectorLayer from "ol/layer/Vector";
import { Cluster, Vector } from 'ol/source';
import { makeClusterLayer } from "./clusterLayer";
import huts from "./huts";
import type Map from "ol/Map";

export const getLayers = async (map: Map) => {
    return [
        await makeClusterLayer(map, huts)
    ]
}