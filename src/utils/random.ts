export const random = (min: number = 1, max?: number) => {
    if (!max) {
        max = min;
        min = 0;
    }
    return Math.random() * (max - min) + min;
}

export const pickRandom = <T>(of: ArrayLike<T>): T => {
    return of[Math.floor(random(of.length))];
}