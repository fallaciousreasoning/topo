<script lang="ts">
  import MapPositioner from "./MapPositioner.svelte";
  import MapSearch from "./MapSearch.svelte";

  import "ol/ol.css";
  import Map from "ol/Map";
  import View from "ol/View";
  import TileLayer from "ol/Layer/Tile";
  import OSM from "ol/source/OSM";
  import XYZ from "ol/source/XYZ";
  import { fromLonLat } from "ol/proj";
  import { onMount } from "svelte";
  import MapLocator from "./MapLocator.svelte";
  import { FullScreen, ScaleLine, defaults as defaultControls, Rotate } from "ol/control";
  import { defaults as defaultInteractions, DragRotateAndZoom } from 'ol/interaction';
  let map = undefined;
  onMount(() => {
    map = new Map({
      target: "topo-map",
      controls: defaultControls().extend([new FullScreen(), new ScaleLine()]),
      interactions: defaultInteractions().extend([new DragRotateAndZoom()]),
      layers: [
        new TileLayer({
          source: new XYZ({
            url:
              "https://tiles-{a-c}.data-cdn.linz.govt.nz/services;key=d0772bed2204423f87157f7fb1223389/tiles/v4/layer=50767/EPSG:3857/{z}/{x}/{y}.png",
          }),
        }),
      ],
      view: new View({
        center: fromLonLat([172.633, -43.533]),
        zoom: 11,
      }),
    });
  });
</script>

<style>
  .map {
    width: 100vw;
    height: 100vh;
  }

  :global(.ol-rotate) {
    top: 3em;
  }
</style>

<div id="topo-map" class="map" />
<MapPositioner {map} />
<MapSearch />
<MapLocator {map} />
