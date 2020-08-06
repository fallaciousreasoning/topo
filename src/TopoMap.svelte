<script lang="ts">
  import MapPositioner from "./MapPositioner.svelte";
  import MapSearch from "./MapSearch.svelte";

  import "ol/ol.css";
  import Map from "./ol/Map.svelte";
  import View from "./ol/View.svelte";
  import TileLayer from "./ol/TileLayer.svelte";
  import OSM from "ol/source/OSM";
  import XYZ from "ol/source/XYZ";
  import { fromLonLat } from "ol/proj";
  import { onMount } from "svelte";
  import MapLocator from "./MapLocator.svelte";
  import {
    FullScreen,
    ScaleLine,
    defaults as defaultControls,
    Rotate,
  } from "ol/control";
  import {
    defaults as defaultInteractions,
    DragRotateAndZoom,
  } from "ol/interaction";
  import LayerSwitcher from "ol-layerswitcher";
  import "ol-layerswitcher/src/ol-layerswitcher.css";
  import { getLayers } from "./layers";
  import {
    enableZoomToCluster,
    zoomToGeocodeResult,
  } from "./utils/zoomToFeature";
  import portal from "./utils/portal";
  import { nzBounds } from "./utils/bounds";
  import LayerGroup from "./ol/LayerGroup.svelte";
  import FeatureLayers from "./layers/FeatureLayers.svelte";

  // onMount(async () => {
  //   map = new Map({
  //     target: "topo-map",
  //     controls: defaultControls().extend([
  //       new FullScreen(),
  //       new ScaleLine(),
  //       new LayerSwitcher(),
  //     ]),
  //     interactions: defaultInteractions().extend([new DragRotateAndZoom()]),
  //     layers: [
  //       new LayerGroup({
  //         title: "Base Layers",
  //         layers: [
  //           new TileLayer({
  //             title: "NZ Topo",
  //             type: "base",
  //             source: new XYZ({
  //               url:
  //                 "https://tiles-{a-c}.data-cdn.linz.govt.nz/services;key=d0772bed2204423f87157f7fb1223389/tiles/v4/layer=50767/EPSG:3857/{z}/{x}/{y}.png",
  //             }),
  //           } as any),
  //           new TileLayer({
  //             title: "Open Street Maps",
  //             type: "base",
  //             visible: false,
  //             source: new OSM(),
  //           } as any),
  //         ],
  //       } as any),
  //     ],
  //     view: new View({
  //       constrainOnlyCenter: true,
  //       smoothExtentConstraint: true,
  //       extent: nzBounds,
  //       zoom: 11,
  //       maxZoom: 18,
  //       minZoom: 4
  //     }),
  //   });

  //   map.getView().fit(nzBounds);

  //   const hutsAndCampsites = new LayerGroup({
  //     title: "Huts & Campsites",
  //     layers: await getLayers(map),
  //   } as any);
  //   map.addLayer(hutsAndCampsites);

  //   enableZoomToCluster(map);
  // });
</script>

<style>
  #topo-map {
    width: 100vw;
    height: 100vh;
    background: #d0e6f4;
  }

  :global(#topo-map > div) {
    width: 100%;
    height: 100vh;
  }
</style>

<div id="topo-map">

  <Map>
    <View
      constrainOnlyCenter
      smoothExtentConstraint
      maxZoom={18}
      minZoom={4}
      extent={nzBounds}
      initialView={nzBounds} />
    <MapPositioner />
    <LayerGroup title="Base Layers">
      <TileLayer
        title="Open Street Maps"
        type="base"
        visible={false}
        source={new OSM()} />
      <TileLayer
        title="NZ Topo"
        type="base"
        source={'https://tiles-{a-c}.data-cdn.linz.govt.nz/services;key=d0772bed2204423f87157f7fb1223389/tiles/v4/layer=50767/EPSG:3857/{z}/{x}/{y}.png'} />
    </LayerGroup>
    <LayerGroup title="Features">
      <FeatureLayers />
    </LayerGroup>
  </Map>
</div>
