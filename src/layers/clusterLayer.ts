import type Feature from "ol/Feature";
import VectorSource from "ol/source/Vector";
import { Cluster } from "ol/source";
import VectorLayer from "ol/layer/Vector";
import { Style, Circle, Text, Stroke, Fill } from "ol/style";
import type Map from 'ol/Map';
import { StyleLike } from "ol/style/Style";

export const makeClusterLayer = async (map: Map, from: { getFeatures: () => Promise<Feature[]>, clusterDistance: number, name: string, style: StyleLike }) => {
    const features  = await from.getFeatures();
    const source = new VectorSource({
        features: features
    });

    const clusterSource = new Cluster({
        distance: from.clusterDistance,
        source: source
    });

    const clusters = new VectorLayer({
        title: from.name,
        source: clusterSource,
        visible: false,
        style: from.style
    } as any);

    return clusters;
}