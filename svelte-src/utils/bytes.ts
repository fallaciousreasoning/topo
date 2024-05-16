import round from "./round";
import { friendlyize } from "./friendlyUnits";

const descriptions = [
    'B',
    'KB',
    'MB',
    'GB',
    'TB'
];

export const friendlyBytes = (bytes: number, decimalPlaces: number=2) => {
    return friendlyize(bytes, descriptions, 1024, true, decimalPlaces);
}
