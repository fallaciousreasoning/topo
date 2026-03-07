export const LINZ_BASEMAPS_KEY = 'd01fbtg0ar3v159zx4e0ajt0n09'
export const linzVectorId = 'topoVector'

import { StyleSpecification } from "maplibre-gl"

export type RangeLayerSetting = {
    type: 'range'
    label: string
    description?: string
    default: number
    min: number
    max: number
    step: number
}

export type LayerSettingDescriptor = RangeLayerSetting

type LayerShared = {
    id: string,
    name: string,
    description: string,
    cacheable: boolean,
    settings?: Record<string, LayerSettingDescriptor>
}

export type BaseLayerDefinition = {
    version?: number,
    type: 'base',
} & Pick<StyleSpecification, 'layers' | 'sources'> & LayerShared

export interface OverlayDefinition extends LayerShared {
    type: 'overlay',
    source: React.ReactNode | (() => React.ReactNode),
    defaultOpacity?: number
}
