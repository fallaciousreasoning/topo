import { createCompositeLayer } from "../caches/compositeProtocol";
import { BaseLayerDefinition, LINZ_BASEMAPS_KEY } from "./config";

// TODO: Work out how to reuse the hillshade tiles
const hillshadeUrl = `https://basemaps.linz.govt.nz/v1/tiles/geographx-nz-dem-2012-8m/WebMercatorQuad/{z}/{x}/{y}.webp?api=${LINZ_BASEMAPS_KEY}`;
const hillshade50 = createCompositeLayer(
  "color-burn",
  `maybe-cache://basemaps.linz.govt.nz/v1/tiles/nz-topo50-new-zealand-mainland-gridless/WebMercatorQuad/{z}/{x}/{y}.webp?api=c01kk4xh3821a8pgvm6fb379ndn#topo-raster`,
  hillshadeUrl,
);

const hillshade250 = createCompositeLayer(
  "color-burn",
  `maybe-cache://basemaps.linz.govt.nz/v1/tiles/nz-topo250-new-zealand-mainland-gridless/WebMercatorQuad/{z}/{x}/{y}.webp?api=c01kk4xh3821a8pgvm6fb379ndn#topo-raster`,
  hillshadeUrl,
);

export default {
  id: "topo-raster",
  name: "LINZ Topo50",
  description: "The classic LINZ topo50 series of maps",
  type: "base",
  cacheable: true,
  sources: {
    topo50: {
      id: "topo50",
      type: "raster",
      tiles: [hillshade50],
      tileSize: 128,
      minzoom: 12,
    },
    topo250: {
      id: "topo250",
      type: "raster",
      tiles: [hillshade250],
      tileSize: 256,
      minzoom: 0,
        maxzoom: 12,
      },
  },
  layers: [
    { id: "topo250", type: "raster", source: "topo250", maxzoom: 12 },
    { id: "topo50", type: "raster", source: "topo50", minzoom: 12 },
  ],
} as BaseLayerDefinition;
