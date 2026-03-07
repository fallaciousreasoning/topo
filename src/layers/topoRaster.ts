import { createCompositeLayer } from "../caches/compositeProtocol";
import { BaseLayerDefinition, LINZ_BASEMAPS_KEY } from "./config";

// TODO: Work out how to reuse the hillshade tiles
const hillshadeUrl = `https://basemaps.linz.govt.nz/v1/tiles/geographx-nz-dem-2012-8m/WebMercatorQuad/{z}/{x}/{y}.webp?api=${LINZ_BASEMAPS_KEY}`;

export const hillshadeBlendSetting = {
  type: 'range' as const,
  label: 'Hillshade blend',
  description: "Controls how strongly the hillshade effect is applied to the topo map. The raster topo map has a separate hillshade layer because MapLibre doesn't support blend modes",
  default: 0.5,
  min: 0,
  max: 1,
  step: 0.05,
}

export function createTopoRasterSources(blend: number) {
  const hillshade50 = createCompositeLayer(
    "color-burn",
    blend,
    `maybe-cache://basemaps.linz.govt.nz/v1/tiles/nz-topo50-new-zealand-mainland-gridless/WebMercatorQuad/{z}/{x}/{y}.webp?api=${LINZ_BASEMAPS_KEY}#topo-raster`,
    hillshadeUrl,
  );

  const hillshade250 = createCompositeLayer(
    "color-burn",
    blend,
    `maybe-cache://basemaps.linz.govt.nz/v1/tiles/nz-topo250-new-zealand-mainland-gridless/WebMercatorQuad/{z}/{x}/{y}.webp?api=${LINZ_BASEMAPS_KEY}#topo-raster`,
    hillshadeUrl,
  );

  return {
    topo50: {
      id: "topo50",
      type: "raster" as const,
      tiles: [hillshade50],
      tileSize: 128,
      minzoom: 12,
    },
    topo250: {
      id: "topo250",
      type: "raster" as const,
      tiles: [hillshade250],
      tileSize: 192,
      minzoom: 0,
      maxzoom: 12,
    },
  }
}

export default {
  id: "topo-raster",
  name: "LINZ Topo50",
  description: "The classic LINZ topo50 series of maps",
  type: "base",
  cacheable: true,
  settings: {
    hillshadeBlend: hillshadeBlendSetting,
  },
  sources: createTopoRasterSources(hillshadeBlendSetting.default),
  layers: [
    { id: "topo250", type: "raster", source: "topo250", maxzoom: 12 },
    { id: "topo50", type: "raster", source: "topo50", minzoom: 12 },
  ],
} as BaseLayerDefinition;
