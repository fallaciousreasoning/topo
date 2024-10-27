export interface Track {
    coordinates: [number, number][]
    elevations?: {
        percent: number,
        elevation: number
    }[]
}
