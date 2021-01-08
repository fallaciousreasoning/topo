<script lang="ts">
  import "ol/ol.css";
  import OSM from "ol/source/OSM";
  import MapDownloader from "./components/MapDownloader.svelte";
  import MapFeatures from "./components/MapFeatures.svelte";
  import MapLocator from "./components/MapLocator.svelte";
  import MapMeasure from "./components/MapMeasure.svelte";
  import MapSearch from "./components/MapSearch.svelte";
  import MapZoom from "./components/MapZoom.svelte";
  import FeatureLayers from "./layers/FeatureLayers.svelte";
  import { linzTopo, openTopo } from "./layers/layerDefinitions";
  import { linzAerialLayerUrl } from "./layers/linzAerialSource";
  import MapLabel from "./MapLabel.svelte";
  import MapPositioner from "./MapPositioner.svelte";
  import Controls from "./ol/Controls.svelte";
  import LayerGroup from "./ol/LayerGroup.svelte";
  import Map from "./ol/Map.svelte";
  import TileLayer from "./ol/TileLayer.svelte";
  import View from "./ol/View.svelte";
  import cachingSource from "./sources/cachingSource";
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
        source={cachingSource(openTopo)} />
      <TileLayer
        title="LINZ Aerial Imagery"
        type="base"
        visible={false}
        source={linzAerialLayerUrl} />
      <TileLayer
        title="LINZ Topo"
        type="base"
        source={cachingSource(linzTopo)} />
    </LayerGroup>
    <LayerGroup title="Features">
      <FeatureLayers />
    </LayerGroup>

    <Controls defaults={['rotate', 'scaleline']}>
      <MapSearch
        on:change={(e) => {
          const [lng, lat] = [e.detail.result.lon, e.detail.result.lat];
          setLabel({ lat, lng, text: e.detail.result.name });
        }} />
      <MapZoom />
      <MapLocator />
      <MapMeasure />
      <MapDownloader />
      <MapFeatures />
    </Controls>
    <MapLabel />
  </Map>
</div>
