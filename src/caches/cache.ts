export interface Cache {
    name: string,
    saveTile: (layer: string, id: string, blob: Blob) => Promise<void>
    loadTile: (layer: string, id: string) => Promise<Blob | null>
    clearLayer: (layer: string) => Promise<void>
    getLayerSizes: () => Promise<{ [layer: string]: number }>
    /** Delete only the tiles within the given geographic bounding box. Returns the number deleted. */
    deleteTilesInBbox: (layer: string, west: number, south: number, east: number, north: number) => Promise<number>
}
