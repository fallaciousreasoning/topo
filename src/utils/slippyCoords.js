const sec = value => 1/Math.cos(value);

export const latLngToTile = (latlng, zoom) => {
    const lat = latlng.lat;
    const latRad = lat / 180 * Math.PI;

    const lng = latlng.lng;

    const n = 2 ** zoom
    const x = Math.floor(n * (lng + 180) / 360);
    const y = Math.floor(n * (1 - (Math.log(Math.tan(latRad) + sec(latRad)) / Math.PI)) / 2);

    return { x, y };
};

export const tileToLatLng = (x, y) => {

}