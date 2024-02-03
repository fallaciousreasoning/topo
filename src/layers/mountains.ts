import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';

import fragment from '../stores/fragment';
import mountains, { type Mountains } from '../stores/mountains';
import { getLayerData } from './data';

const styleCache = {};

export default {
    id: "mountains",
    title: "Mountains",
    description: "A list of mountains with routes from Climb NZ",
    source: "https://github.com/fallaciousreasoning/nz-mountains",
    view: "cluster",
    clusterDistance: 50,
    style: feature => {
        const size = feature.get('features').length;
        if (!styleCache[size]) {
            styleCache[size] = new Style({
                image: new Circle({
                    radius: 20,
                    stroke: new Stroke({ color: 'white' }),
                    fill: new Fill({ color: '#FFFFFFC0' })
                }),
                text: new Text({
                    scale: size == 1 ? 2.5 : 1.5,
                    textAlign: 'center',
                    text: size === 1 ? `⛰️` : `${size} ⛰️`,
                    fill: new Fill({ color: 'black' })
                })
            })
        }
        return styleCache[size];
    },
    getData: async () => {
        const url = "https://raw.githubusercontent.com/fallaciousreasoning/nz-mountains/main/mountains.json"
        const response = await fetch(url);
        const result = await response.json() as Mountains;
        mountains.set(result);
        return result
    },
    async getFeatures() {
        const data = await getLayerData(this);
        const points = Object.values(data).filter(a => a.latlng);
        return points.map(mountain => {
            const coords = fromLonLat([mountain.latlng![1], mountain.latlng![0]]);
            const feature = new Feature(new Point(coords));
            feature.setId(mountain.link)
            return feature;
        })
    },
    onFeatureClicked: (feature: Feature) => {
        const features = feature.get('features');
        if (features.length > 1) return;

        const originalFeature = features[0] as Feature

        fragment.update(value => ({
            ...value,
            page: `mountains/${encodeURIComponent(originalFeature.getId()!)}`
        }))

    }
}
