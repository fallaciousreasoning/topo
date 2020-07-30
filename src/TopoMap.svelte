<script lang="ts">
  import "ol/ol.css"
  import Map from "ol/Map";
  import View from "ol/View";
  import TileLayer from "ol/Layer/Tile";
  import OSM from "ol/source/OSM"
  import XYZ from "ol/source/XYZ";
  import { fromLonLat } from "ol/proj";
  import { onMount } from "svelte";

  onMount(() => {
    const map = new Map({
      target: "topo-map",
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
        zoom: 11
      }),
    });
  });
</script>

<style>
  .map {
    width: 100vw;
    height: 100vh;
  }
</style>

<div id="topo-map" class="map" />
