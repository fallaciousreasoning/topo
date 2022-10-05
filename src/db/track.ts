import LineString from "ol/geom/LineString";
import { toLonLat, fromLonLat } from "ol/proj";
import { LatLng } from "./latlng";

export interface Track {
    id: string;
    name: string;
    created: number;
    updated: number;
    draft?: boolean;
    distance: number;
    elevations?: { percent: number; elevation: number }[];
    points: LatLng[];
}

export const lineStringToLatLngs = (line: LineString) => line.getCoordinates().map(c => toLonLat(c)).map(([a, b]) => [b, a] as LatLng);
export const trackToGeometry = (track: Track) => new LineString(track.points.map(([lat, lng]) => fromLonLat([lng, lat])))
export const copyTrackImportLink = async (track: Track) => {
    const json = JSON.stringify(track);
    const link = `${window.location.origin}#page=importTrack/${encodeURIComponent(json)}`;
    await navigator.clipboard.writeText(link);
}
