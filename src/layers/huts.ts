import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import type { Place } from '../search/places';
import fragment from '../stores/fragment';

const styleCache = {};
export default {
    id: "huts",
    title: "Huts",
    description: "A list of backcountry huts and bivvies in NZ",
    visible: false,
    url: "/DOC_Huts.geojson",
    source: "https://catalogue.data.govt.nz/dataset/doc-huts/resource/4ccb1724-4969-4ae0-961c-0a3b073e5e55",
    type: "geojson",
    view: "cluster",
    clusterDistance: 50,
    style: feature => {
        const size = feature.get('features').length;
        if (!styleCache[size]) {
            styleCache[size] = new Style({
                image: new Circle({
                    radius: 20,
                    stroke: new Stroke({ color: 'white' }),
                    fill: new Fill({ color: '#194036' })
                }),
                text: new Text({
                    text: size === 1 ? `🏠` : `${size} 🏠`,
                    fill: new Fill({ color: 'white' })
                })
            })
        }
        return styleCache[size];
    },
    getData: async () => {
        const url = "/data/huts.json"
        const response = await fetch(url);
        const data = await response.json() as any[];
        for (const hut of data) {
            hut.place = 'hut'
        }
        return data as Place[]
    },
    async getFeatures() {
        const data = await this.getData()
        return data.map(hut => {
            const coords = fromLonLat([hut.lon, hut.lat]);
            const feature = new Feature(new Point(coords));
            feature.set('hut', hut);
            return feature
        })
    },
    onFeatureClicked: (feature: Feature) => {
        const features = feature.get('features');
        if (features.length > 1) return;

        const originalFeature = features[0] as Feature
        const hut = originalFeature.get('hut') as { lon: number, lat: number, name: string }
        fragment.update(u => ({
            ...u,
            label: {
                lat: hut.lat,
                lng: hut.lon,
                text: hut.name
            }
        }))

    }
}
