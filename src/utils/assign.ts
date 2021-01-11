export const applyUpdate = <Key extends keyof Type, Type>(key: Key, to: Type, update: Partial<Type[Key]>) => {
    return {
        ...to,
        [key]: {
            ...to[key],
            ...update
        }
    };
}