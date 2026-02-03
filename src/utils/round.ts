export default (n: number, dps: number=2) => {
    const exp = 10**dps;
    return Math.round(n * exp) / exp;
};
