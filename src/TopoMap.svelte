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
  import Marker from "./Marker.svelte";
  import VectorLayer from "./ol/VectorLayer.svelte";
  import Feature from "./ol/Feature.svelte";
  import { Style, Icon, Text } from "ol/style";
  import { XYZ } from "ol/source";
  import { pickRandom } from "./utils/random";
  import cachingSource from "./caching/cachingSource";
  import MapDownloader from "./MapDownloader.svelte";
  import { tileUrlFunction, tileCacheId } from "./layers/linzTopoSource";
  import DrawTrack from "./tools/DrawTrack.svelte";
  import Measure from "./components/Measure.svelte";

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

    <Controls defaults={['zoom', 'layerSwitcher', 'rotate', 'scaleline']}>
      <MapLocator />
      <MapSearch
        on:change={(e) => {
          const lnglat = [e.detail.result.lon, e.detail.result.lat];
          popupInfo = { detail: e.detail.result.name, title: 'Location', position: fromLonLat(lnglat) };
          zoomToGeocodeResult(e.detail.map, e.detail.result);
        }} />
      <MapDownloader />
      <Measure />
    </Controls>

    {#if !!popupInfo}
      <Popup position={popupInfo.position}>
        <p>{popupInfo.detail}</p>
      </Popup>
    {/if}
  </Map>
</div>
