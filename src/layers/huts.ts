import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Circle, Stroke, Fill, Text } from 'ol/style';

const styleCache = {};
export default {
    name: "Huts",
    description: "A list of backcountry huts and bivvies in NZ",
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
    getFeatures: async () => {
        const url = "/data/huts.json"
        const response = await fetch(url);
        const data = await response.json();
        return data.map(hut => {
            const coords = fromLonLat([hut.lon, hut.lat]);
            return new Feature(new Point(coords));
        })
    }
}