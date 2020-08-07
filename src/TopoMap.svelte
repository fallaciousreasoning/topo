<script lang="ts">
  import "ol/ol.css";
  import { fromLonLat } from "ol/proj";
  import OSM from "ol/source/OSM";
  import FeatureLayers from "./layers/FeatureLayers.svelte";
  import MapLocator from "./MapLocator.svelte";
  import MapPositioner from "./MapPositioner.svelte";
  import MapSearch from "./MapSearch.svelte";
  import Controls from "./ol/Controls.svelte";
  import LayerGroup from "./ol/LayerGroup.svelte";
  import Map from "./ol/Map.svelte";
  import Popup from "./ol/Popup.svelte";
  import TileLayer from "./ol/TileLayer.svelte";
  import View from "./ol/View.svelte";
  import { nzBounds } from "./utils/bounds";
  import { zoomToGeocodeResult } from "./utils/zoomToFeature";
  import type { Coordinate } from "ol/coordinate";

  interface PopupInfo {
    position: Coordinate;
    title: string;
    detail: string;
  }

  let popupInfo: PopupInfo;
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

    <Controls
      defaults={['zoom', 'fullscreen', 'layerSwitcher', 'rotate', 'scaleline']}>
      <MapLocator />
      <MapSearch
        on:change={(e) => {
          const lnglat = [e.detail.result.lon, e.detail.result.lat];
          popupInfo = {
            detail: e.detail.result.displayName,
            title: "Location",
            position: fromLonLat(lnglat)
          }
          zoomToGeocodeResult(e.detail.map, e.detail.result);
        }} />
    </Controls>

    {#if !!popupInfo}
      <Popup position={popupInfo.position}>
        <h2>{popupInfo.title}</h2>
        <p>{popupInfo.detail}</p>
      </Popup>
    {/if}
  </Map>
</div>
