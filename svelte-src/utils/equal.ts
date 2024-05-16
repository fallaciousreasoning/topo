import round from "./round";

export const areSimilar = (array1: number[], array2: number[], dps: number) => {
    if (array1.length !== array2.length) return false;

    for (let i = 0; i < array1.length; ++i) {
        const one = round(array1[i], dps);
        const two = round(array2[i], dps);
        if (one != two) {
            return false;
        }
    }

    return true;
}

export const shallowEqual = <T extends object>(obj1: T, obj2: T) => {
    const keys = Object.keys(obj1);
    if (Object.keys(obj2).length !== keys.length) return false;

    for (const key of keys) {
        if (obj1[key] !== obj2[key]) return false;
    }

    return true;
}