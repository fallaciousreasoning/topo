import { Coordinate } from "ol/coordinate";

const sec = (value: number) => 1/Math.cos(value);

export const coordinateToTile = ([lon, lat]: Coordinate, zoom: number) => {
    const latRad = lat / 180 * Math.PI;
    const n = 2 ** zoom
    const x = Math.floor(n * (lon + 180) / 360);
    const y = Math.floor(n * (1 - (Math.log(Math.tan(latRad) + sec(latRad)) / Math.PI)) / 2);

    return { x, y };
};