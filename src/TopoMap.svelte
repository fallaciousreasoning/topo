<script>
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import "leaflet.locatecontrol";
  import "leaflet.locatecontrol/dist/L.Control.Locate.css";
  import GeoSearch from "leaflet-geosearch";
  import "leaflet-geosearch/dist/style.css";
  import "leaflet-geosearch/assets/css/leaflet.css";

  import "./leaflet/FallbackLayer.js";
  import "./leaflet/SmoothWheelZoom.js";
  import { onMount } from "svelte";

  import MapPositioner from "./MapPositioner.svelte";

  let mapElement = undefined;
  let map = undefined;

  onMount(() => {
    map =
      mapElement &&
      L.map(mapElement, {
        zoomSnap: 0.1,
        scrollWheelZoom: false, // disable original zoom function
        smoothWheelZoom: true, // enable smooth zoom
        smoothSensitivity: 1 // zoom speed. default is 1
      }).setView([-43.533, 172.633], 11);
    window.map = map;

    const openStreetMapsUrl =
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const openTopoMapsUrl = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
    const linzTopo50Url =
      "https://koordinates-tiles-b.global.ssl.fastly.net/services;key=ea101320e45744fb91e54f0b1f57aae6/tiles/v4/layer=50767,style=auto/{z}/{x}/{y}.png";

    const openStreetMapsLayer = L.tileLayer.fallback(openStreetMapsUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 17,
      minZoom: 1,
      edgeBufferTiles: 1,
      crossOrigin: "anonymous",
      updateWhenIdle: false
    });

    const openTopoMapsLayer = L.tileLayer
      .fallback(openTopoMapsUrl, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 17,
        minZoom: 1,
        edgeBufferTiles: 1,
        crossOrigin: "anonymous",
        updateWhenIdle: false
      })
      .addTo(map);

    const linzTopo50Layer = L.tileLayer.fallback(linzTopo50Url, {
      attribution: "",
      maxZoom: 21,
      crossOrigin: "anonymous",
      bounds: [[-34.4, 166], [-47.4, 178.6]],
      edgeBufferTiles: 1,
      updateWhenIdle: false
    });

    const baseMaps = {
      "NZ Topo 50": linzTopo50Layer,
      "Open Topo Maps": openTopoMapsLayer,
      "Open Street Maps": openStreetMapsLayer
    };
    L.control.layers(baseMaps).addTo(map);

    // Scale control.
    L.control.scale().addTo(map);

    // GeoSearch control.
    const provider = new GeoSearch.OpenStreetMapProvider();
    new GeoSearch.GeoSearchControl({
      provider: provider,
      autoClose: true,
      style: "button"
    }).addTo(map);

    // Locate control.
    L.control.locate().addTo(map);

    // Make sure the map size is accurate.
    setTimeout(() => map.invalidateSize());
  });
</script>

<style>
  .map {
    width: 100vw;
    height: 100vh;
  }

  :global(.leaflet-retina a.leaflet-control-layers-toggle) {
    background-image: url("/images/layers-2x.png");
  }

  :global(.a.leaflet-control-layers-toggle) {
    background-image: url("/images/layers.png");
  }
</style>

<div class="map" bind:this={mapElement} />
<MapPositioner {map} />
