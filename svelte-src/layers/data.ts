const cache = new Map()
export const getLayerData = <T>(layer: { getData: () => Promise<T> }): Promise<T> => {
    if (cache.has(layer)) return cache.get(layer)

    const promise = layer.getData()
    cache.set(layer, promise)
    return promise
}
