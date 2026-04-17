export interface Region {
    id: string
    name: string
    /** Short code used in bundle filenames (Stats NZ alphabetic codes for regional councils). */
    code: string
    group: 'island' | 'region'
    /** Closed ring of [lng, lat] coordinates */
    polygon: [number, number][]
    minZoom: number
    maxZoom: number
}

/** Rectangular polygon [lng, lat] closed ring */
function rect(west: number, south: number, east: number, north: number): [number, number][] {
    return [[west, south], [east, south], [east, north], [west, north], [west, south]]
}

export const NZ_REGIONS: Region[] = [
    // Country / island level
    { id: 'nz',            code: 'NZ',  name: 'New Zealand',              group: 'island', minZoom: 0, maxZoom: 15, polygon: rect(165.8, -47.5, 178.7, -34.0) },
    { id: 'north-island',  code: 'NI',  name: 'North Island',             group: 'island', minZoom: 0, maxZoom: 15, polygon: rect(172.5, -41.8, 178.7, -34.4) },
    { id: 'south-island',  code: 'SI',  name: 'South Island',             group: 'island', minZoom: 0, maxZoom: 15, polygon: rect(165.9, -46.8, 174.5, -40.5) },
    { id: 'stewart-island', code: 'STI', name: 'Stewart Island / Rakiura', group: 'island', minZoom: 0, maxZoom: 15, polygon: rect(167.1, -47.5, 168.3, -46.7) },

    // Regional councils — Stats NZ alphabetic codes
    { id: 'northland',          code: 'NTL', name: 'Northland',            group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(172.5, -36.4, 174.8, -34.4) },
    { id: 'auckland',           code: 'AUK', name: 'Auckland',             group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(174.3, -37.3, 175.6, -36.1) },
    { id: 'waikato',            code: 'WKO', name: 'Waikato',              group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(174.3, -38.9, 176.5, -36.7) },
    { id: 'bay-of-plenty',      code: 'BOP', name: 'Bay of Plenty',        group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(175.7, -38.8, 178.2, -37.1) },
    { id: 'gisborne',           code: 'GIS', name: 'Gisborne',             group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(177.1, -39.0, 178.7, -37.5) },
    { id: 'hawkes-bay',         code: 'HKB', name: "Hawke's Bay",          group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(175.8, -40.5, 177.8, -38.7) },
    { id: 'taranaki',           code: 'TKI', name: 'Taranaki',             group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(173.5, -39.8, 174.7, -38.8) },
    { id: 'manawatu-whanganui', code: 'MWT', name: 'Manawatū-Whanganui',   group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(174.5, -40.9, 176.8, -38.7) },
    { id: 'wellington',         code: 'WGN', name: 'Wellington',           group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(174.5, -41.8, 176.3, -40.7) },
    { id: 'tasman',             code: 'TAS', name: 'Tasman',               group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(171.7, -42.1, 172.9, -40.5) },
    { id: 'nelson',             code: 'NSN', name: 'Nelson',               group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(172.9, -41.7, 173.5, -41.0) },
    { id: 'marlborough',        code: 'MBH', name: 'Marlborough',          group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(173.1, -42.5, 174.4, -41.0) },
    { id: 'west-coast',         code: 'WTC', name: 'West Coast',           group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(167.9, -44.7, 172.1, -41.6) },
    { id: 'canterbury',         code: 'CAN', name: 'Canterbury',           group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(169.6, -44.8, 173.3, -42.1) },
    { id: 'otago',              code: 'OTA', name: 'Otago',                group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(167.5, -46.5, 171.2, -43.5) },
    { id: 'southland',          code: 'STL', name: 'Southland',            group: 'region', minZoom: 0, maxZoom: 15, polygon: rect(166.0, -46.8, 169.5, -45.2) },
]
