import round from "./round";

export const friendlyize = (amount: number, units: string[], chunkSize: number, pluralize: boolean, dps: number) => {
    let size = 0;
    while (amount >= chunkSize && size < units.length - 1) {
        amount /= chunkSize;
        size += 1;
    }

    amount = round(amount, dps);
    let result = `${amount.toFixed(dps)}${units[size]}`

    if (pluralize && amount !== 1)
        result += 's';

    return result;
}

export const friendlyDistance = (amount: number) => {
    return friendlyize(amount, [
        "m",
        "km"
    ], 1000, false, 2);
}