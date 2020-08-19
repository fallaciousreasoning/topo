import { Coordinate } from "ol/coordinate";
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
    vectoryQuery: {
        layers: { [layerNumber: string]: LinzLayer }
    }
}

export const heightAtPoint = async (lat: number, lng: number) => {
    const layer = '50768';
    const params = {
        key: 'fcac9d10d1c84527bd2a1ca2a35681d8',
        layer,
        x: '' + lng,
        y: '' + lat,
        // Results are ordered by closeness, this ensures we get at least one point.
        radius: '10000',
        max_results: '' + 1,
    };

    const queryString = new URLSearchParams(Object.entries(params));
    const url = `https://data.linz.govt.nz/services/query/v1/vector.json?${queryString.toString()}`

    const response = await fetch(url);
    const data = await response.json() as LinzResponse;

    const features = data.vectoryQuery.layers[layer].features;
    const feature = features[0];
    if (!feature)
        return null;

    return feature.properties.elevation;
}

export const getPathHeight = async (path: LineString, step = 100 /*metres*/) => {
    const length = path.getLength();
    const percentStep = Math.max(1, step / length);

    const heightPromises: Promise<{ height: number, percent: number }>[] = [];
    for (let progress = 0; progress <= 1; progress += percentStep) {
        const point = path.getCoordinateAt(progress);
        const [lon, lat] = toLonLat(point);

        heightPromises.push(heightAtPoint(lat, lon).then(height => ({
            height,
            percent: progress
        })))        
    }

    return (await Promise.all(heightPromises)).filter(r => r.height !== null);
}