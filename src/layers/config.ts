import { MapStyle } from "react-map-gl"

export const LINZ_BASEMAPS_KEY = 'd01fbtg0ar3v159zx4e0ajt0n09'
export const linzVectorId = 'topoVector'

type LayerShared = {
    id: string,
    name: string,
    description: string,
    cacheable: boolean
}

export type BaseLayerDefinition = {
    version?: number,
    type: 'base',
} & Pick<MapStyle, 'layers' | 'sources'> & LayerShared

export interface OverlayDefinition extends LayerShared {
    type: 'overlay',
    source: React.ReactNode | (() => React.ReactNode)
}
