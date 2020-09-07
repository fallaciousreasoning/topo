import Feature from "ol/Feature";
import { fromLonLat } from "ol/proj";
import Point from "ol/geom/Point";
import { corsFetch } from "../utils/cors";
import { Style, Circle, Stroke, Fill, Text } from "ol/style";
import Collection from "ol/Collection";

interface SubjectValue {
    humidity: number;
    issuedAt: string; // ISO-8601 date
    pressure: {
        atSeaLevel: string;
    },
    rainfall: string;
    temp: number;
    wind: {
        averageSpeed: 6,
        direction: string; // Compass direction
        strength: string; // Description of wind strength.
    }
}

interface MetServiceMapMarkerSubject {
    asAt: string; // ISO-8601 date
    value: SubjectValue;
}

interface MetServiceMapMarker {
    label: string;
    point: [number, number];
    subject: MetServiceMapMarkerSubject[];
}

interface MetServiceLiveWeatherResponse {
    isSkiSeason: boolean;
    layout: {
        primary: {
            map: {
                markers: MetServiceMapMarker[];
            }
        }
    }
}

const getWeatherIcon = (value: SubjectValue): string => {
    const options = {
        sunCloud: "🌤️",
        rain: "🌧️",
        cloud: "☁️",
        storm: "⛈️",
        snow: "🌨️",
        sun: "☀️",
        wind: "💨"
    };

    const rain = parseFloat(value.rainfall);
    
    if (rain > 0) {
        // I guess it'll be snow/hail if its cold?
        return value.temp < 0
            ? options.snow
            : options.rain;
    }

    // I guess wind greater than 20km/h is windy?
    if (value.wind && value.wind.averageSpeed > 20)
        return options.wind;

    // I don't actually have the data to know if it's cloudy, so this seems safe.
    return options.sunCloud;
}

export default {
    name: "Live Weather",
    description: "Live weather observations from around New Zealand",
    source: "https://www.metservice.com/publicData/webdata/maps-radar/weather-stations/nz",
    view: "cluster",
    clusterDistance: 0,
    getFeatures: async () => {
        const url = "https://www.metservice.com/publicData/webdata/maps-radar/weather-stations/nz";
        const response = await corsFetch(url);
        const data = await response.json() as MetServiceLiveWeatherResponse;

        const observations = data?.layout?.primary?.map?.markers;
        if (!observations)
            return null;

        return observations.map(marker => {
            const coords = fromLonLat([marker.point[1], marker.point[0]]);
            const feature = new Feature(new Point(coords));
            const subject = marker.subject[0]?.value;
            feature.setStyle(new Style({
                image: new Circle({
                    radius: 12,
                    fill: new Fill({ color: 'blue' }),
                    stroke: new Stroke({ color: 'white' })
                }),
                text: new Text({
                    fill: new Fill({ color: 'white' }),
                    text: getWeatherIcon(subject),
                })
            }));
            return feature;
        })
    }
}