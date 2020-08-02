import type Feature from "ol/Feature";
import VectorSource from "ol/source/Vector";
import { Cluster } from "ol/source";
import VectorLayer from "ol/layer/Vector";
import { Style, Circle, Text, Stroke, Fill } from "ol/style";

export const makeClusterLayer = async (from: { getFeatures: () => Promise<Feature[]>, clusterDistance: number, name: string }) => {
    console.log("B")
    const features  = await from.getFeatures();
    console.log(features)
    const source = new VectorSource({
        features: features
    });

    const clusterSource = new Cluster({
        distance: from.clusterDistance,
        source: source
    });

    const styleCache = {};
    const clusters = new VectorLayer({
        title: from.name,
        source: clusterSource,
        style: feature => {
            const size = feature.get('features').length;
            if (!styleCache[size]) {
                styleCache[size] = new Style({
                    image: new Circle({
                        radius: 10,
                        stroke: new Stroke({ color: 'white' }),
                        fill: new Fill({ color: '#73afa4' })
                    }),
                    text: new Text({
                        text: "Foo",
                        fill: new Fill({ color: 'white' })
                    })
                })
            }
            return styleCache[size];
        }
    }as any);

    return clusters;
}