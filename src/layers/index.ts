import type Map from "ol/Map";
import { makeClusterLayer } from "./clusterLayer";
import huts from "./huts";

export const getLayers = async (map: Map) => {
    return [
        await makeClusterLayer(map, huts)
    ]
}