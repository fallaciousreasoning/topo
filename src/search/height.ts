import LineString from "ol/geom/LineString";
import { toLonLat } from "ol/proj";

interface LinzFeature {
    id: string;
    distance: number;
    type: string;
    properties: {
        t50_fid: string;
        elevation: number;
    }
}

interface LinzLayer {
    type: 'FeatureCollection'
    features: LinzFeature[];
}

interface LinzResponse {
    vectorQuery: {
        layers: { [layerNumber: string]: LinzLayer }
    }
}

export const heightAtPoint = async (lat: number, lng: number) => {
    const layers = [
        "50284", // Height Points
        "50334", // Saddle Points
        "50768", // Contours
        "103476" // Trig points
    ];

    const params = {
        key: 'fcac9d10d1c84527bd2a1ca2a35681d8',
        x: '' + lng,
        y: '' + lat,
        // Results are ordered by closeness, this ensures we get at least one point.
        radius: '10000',
        max_results: '' + 1,
    };

    const queryString = new URLSearchParams(Object.entries(params));
    for (const layer of layers)
        queryString.append("layer", layer);
    const url = `https://data.linz.govt.nz/services/query/v1/vector.json?${queryString.toString()}`

    const response = await fetch(url);
    const data = await response.json() as LinzResponse;

    const features = Object.values(data.vectorQuery.layers)
        .reduce((prev, next) => [...prev, ...next.features], [])
        .sort((a, b) => a.distance - b.distance);
    console.log(features);
    const feature = features[0];
    if (!feature)
        return null;

    return feature.properties.elevation;
}

export const getPathHeight = async (path: LineString, step = 100 /*metres*/) => {
    const length = path.getLength();
    const percentStep = Math.min(1, step / length);

    const heightPromises: Promise<{ height: number, percent: number }>[] = [];
    const addPoint = (percent: number) => {
        const point = path.getCoordinateAt(percent);
        const [lon, lat] = toLonLat(point);

        heightPromises.push(heightAtPoint(lat, lon).then(height => ({
            height,
            percent
        })));
    }

    for (let progress = 0; progress < 1; progress += percentStep) {
        addPoint(progress);
    }

    addPoint(1);

    return (await Promise.all(heightPromises)).filter(r => r.height !== null);
}