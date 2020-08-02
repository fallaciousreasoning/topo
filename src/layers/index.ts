import VectorLayer from "ol/layer/Vector";
import { Cluster, Vector } from 'ol/source';
import { makeClusterLayer } from "./clusterLayer";
import huts from "./huts";

export const getLayers = async () => {
    return [
        await makeClusterLayer(huts)
    ]
}