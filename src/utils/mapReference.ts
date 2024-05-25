import { NZMG } from "./nzmgMapSheets";
import proj4 from 'proj4'
proj4.defs([["EPSG:2193", "+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"], ["EPSG:27200", "+proj=nzmg +lat_0=-41 +lon_0=173 +x_0=2510000 +y_0=6023150 +ellps=intl +towgs84=59.47,-5.04,187.44,0.47,-0.1,1.024,-4.5993 +units=m +no_defs"], ["EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs"]]);

export const referenceRegex = /^\s*([a-zA-Z]\d{1,2})\s?(\d{5}[^0-9]?\d{5}|\d{4}\s?\d{4}|\d{3}[^0-9]?\d{3})\s*$/

const coordToMap = (min: number, max: number, coord: string) => {
    const baseFrom = (n: number) => parseFloat((n.toString().substring(0, 2) + coord).padEnd(7, '0'))

    const fromMin = baseFrom(min);
    return fromMin < min ? baseFrom(max) : fromMin
}

export const convertNZMGReferenceToLatLng = (reference: string): [number, number] | undefined => {
    const match = referenceRegex.exec(reference);
    if (!match) return;

    const sheet = match[1].toUpperCase()

    const matchingMap = NZMG.find(n => n.sheet === sheet)
    if (!matchingMap) return;

    const coords = match[2].replace(/[^0-9]/g, '');
    const digitsPerCoord = coords.length / 2;
    const easting = coords.substring(0, digitsPerCoord);
    const northing = coords.substring(digitsPerCoord);

    
    const result = [
        coordToMap(matchingMap.xmin, matchingMap.xmax, easting),
        coordToMap(matchingMap.ymin, matchingMap.ymax, northing)
    ]
    const [lng, lat] = proj4('EPSG:27200', 'WGS84', result)
    return [lat, lng]
}
