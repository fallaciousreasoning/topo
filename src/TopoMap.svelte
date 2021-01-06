<script lang="ts">
  import "ol/ol.css";
  import OSM from "ol/source/OSM";
  import cachingSource from "./caching/cachingSource";
  import MapDownloader from "./components/MapDownloader.svelte";
  import MapLocator from "./components/MapLocator.svelte";
  import MapMeasure from "./components/MapMeasure.svelte";
  import MapZoom from "./components/MapZoom.svelte";
  import FeatureLayers from "./layers/FeatureLayers.svelte";
  import { tileCacheId, tileUrlFunction } from "./layers/linzTopoSource";
  import MapLabel from "./MapLabel.svelte";
  import MapPositioner from "./MapPositioner.svelte";
  import MapSearch from "./components/MapSearch.svelte";
  import Controls from "./ol/Controls.svelte";
  import LayerGroup from "./ol/LayerGroup.svelte";
  import Map from "./ol/Map.svelte";
  import TileLayer from "./ol/TileLayer.svelte";
  import View from "./ol/View.svelte";
  import { setLabel } from "./stores/fragment";
  import { nzBounds } from "./utils/bounds";
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
        title="Open Topo Maps"
        type="base"
        visible={false}
        source={'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png'} />
      <TileLayer
        title="LINZ Aerial Imagery"
        type="base"
        visible={false}
        source={'https://tiles-{a-c}.data-cdn.linz.govt.nz/services;key=fcac9d10d1c84527bd2a1ca2a35681d8/tiles/v4/set=4702/EPSG:3857/{z}/{x}/{y}.png'} />
      <TileLayer
        title="LINZ Topo"
        type="base"
        source={cachingSource({
          tileUrlFunction: tileUrlFunction,
          getCacheId: tileCacheId,
        })} />
    </LayerGroup>
    <LayerGroup title="Features">
      <FeatureLayers />
    </LayerGroup>

    <Controls defaults={['layerSwitcher', 'rotate', 'scaleline']}>
      <MapZoom />
      <MapLocator />
      <MapSearch
        on:change={(e) => {
          const [lng, lat] = [e.detail.result.lon, e.detail.result.lat];
          setLabel({ lat, lng, text: e.detail.result.name });
        }} />
      <MapMeasure />
      <MapDownloader />
    </Controls>
    <MapLabel />
  </Map>
</div>
