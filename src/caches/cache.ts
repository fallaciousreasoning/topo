export interface Cache {
    name: string,
    saveTile: (layer: string, id: string, blob: Blob) => Promise<void>
    loadTile: (layer: string, id: string) => Promise<Blob | null>
}

export interface Tile {
    id: string,
    layer: string,
    data: Blob
}
