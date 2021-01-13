export const applyUpdate = <Key extends keyof Type, Type>(key: Key, to: Type, update: Partial<Type[Key]>) => {
    return {
        ...to,
        [key]: {
            ...to[key],
            ...update
        }
    };
}

export const onlyTruthy = <T>(value: T) => {
    const result: Partial<T> = {};
    for (const key in value) {
        if (!value[key])
            continue;

        result[key] = value[key];
    }
    return result;
}