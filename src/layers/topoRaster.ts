import { createCompositeLayer } from "../caches/compositeProtocol";
import { BaseLayerDefinition, LINZ_BASEMAPS_KEY } from "./config";

// TODO: Work out how to reuse the hillshade tiles
const hillshadeUrl = `https://basemaps.linz.govt.nz/v1/tiles/geographx-nz-dem-2012-8m/WebMercatorQuad/{z}/{x}/{y}.webp?api=${LINZ_BASEMAPS_KEY}`;
const hillshade50 = createCompositeLayer(
  "color-burn",
  `maybe-cache://tiles-cdn.koordinates.com/services;key=d0772bed2204423f87157f7fb1223389/tiles/v4/layer=52343/EPSG:3857/{z}/{x}/{y}.png#topo-raster`,
  hillshadeUrl,
);

const hillshade250 = createCompositeLayer(
  "color-burn",
  `maybe-cache://tiles-cdn.koordinates.com/services;key=d0772bed2204423f87157f7fb1223389/tiles/v4/layer=52324/EPSG:3857/{z}/{x}/{y}.png#topo-raster`,
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
      // Note: Important to set this to 128 so that maplibre-gl picks the
      // zoom + 1 tiles instead of upscaling the zoom level tiles.
      tileSize: 192,
      minzoom: 13,
    },
    topo250: {
      id: "topo250",
      type: "raster",
      tiles: [hillshade250],
      tileSize: 250,
      minzoom: 0,
      maxzoom: 13,
    },
  },
  layers: [
    { id: "topo250", type: "raster", source: "topo250", maxzoom: 13 },
    { id: "topo50", type: "raster", source: "topo50", minzoom: 13 },
  ],
} as BaseLayerDefinition;
