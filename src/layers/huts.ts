import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';

export default {
    name: "Huts",
    description: "A list of backcountry huts and bivvies in NZ",
    url: "/DOC_Huts.geojson",
    source: "https://catalogue.data.govt.nz/dataset/doc-huts/resource/4ccb1724-4969-4ae0-961c-0a3b073e5e55",
    type: "geojson",
    view: "cluster",
    clusterDistance: 50,
    getFeatures: async () => {
        const url = "https://api.doc.govt.nz/v2/huts?coordinates=wgs84"
        const response = await fetch(url, {
            headers: {
                'x-api-key': 'yNyjpuXvMJ1g2d0YEpUmW7VZhePMqbCv96GRjq8L',
            },
            cache: 'force-cache'
        });
        const data = await response.json();
        return data.map(hut => {
            const coords = fromLonLat([hut.lon, hut.lat]);
            return new Feature(new Point(coords));
        })
    }
}