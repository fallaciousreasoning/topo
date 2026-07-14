const BUNDLE_BASE_URL = 'https://pub-36de1a8a322545b9bd6ef274d5f46c7c.r2.dev'

/**
 * `maxZoom` selects the bundle variant: 16 (or unspecified) gets the full-detail HD bundle,
 * 15 or below gets the smaller SD bundle (suffixed `-15`).
 */
export function getBundleUrl(layerId: string, regionCode: string, maxZoom?: number): string {
    if (layerId === 'dem') return `${BUNDLE_BASE_URL}/elevation-tiles-12.tilebundle`
    if (layerId === 'topoVector') return `${BUNDLE_BASE_URL}/topographic-v2.tilebundle`
    const suffix = maxZoom != null && maxZoom <= 15 ? '-15' : ''
    const prefix = layerId === 'topo-raster' ? 'topo' : layerId
    return `${BUNDLE_BASE_URL}/${prefix}-${regionCode.toLowerCase()}${suffix}.tilebundle`
}

/** File extension tiles are stored under in a given layer's bundle (and thus in the OPFS cache). */
export function getBundleTileExt(layerId: string): string {
    return layerId === 'topoVector' ? 'pbf' : 'png'
}

/** Actual file sizes (bytes) of the topo-raster island bundles, for showing accurate download estimates. */
export const ISLAND_BUNDLE_SIZES: Record<string, { hd: number, sd: number }> = {
    'north-island': { hd: 7_392_293_788, sd: 2_952_034_428 },
    'south-island': { hd: 10_577_906_577, sd: 4_206_589_166 },
    'stewart-island': { hd: 54_057_847, sd: 23_291_700 },
}
