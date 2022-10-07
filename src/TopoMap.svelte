<script lang="ts">
  import 'ol/ol.css'
  import OSM from 'ol/source/OSM'
  import MapDownloader from './components/MapDownloader.svelte'
  import MapFeatures from './components/MapFeatures.svelte'
  import MapLocator from './components/MapLocator.svelte'
  import MapMeasure from './components/MapMeasure.svelte'
  import MapMenu from './components/MapMenu.svelte'
  import MapRotate from './components/MapRotate.svelte'
  import MapSearch from './components/MapSearch.svelte'
  import MapZoom from './components/MapZoom.svelte'
  import FeatureLayers from './layers/FeatureLayers.svelte'
  import { layerDefinitions } from './layers/layerDefinitions'
  import MapLabel from './MapLabel.svelte'
  import MapPositioner from './MapPositioner.svelte'
  import Controls from './ol/Controls.svelte'
  import LayerGroup from './ol/LayerGroup.svelte'
  import Map from './ol/Map.svelte'
  import TileLayer from './ol/TileLayer.svelte'
  import View from './ol/View.svelte'
  import cachingSource from './sources/cachingSource'
  import fragment from './stores/fragment'
  import { nzBounds } from './utils/bounds'
</script>

<div id="topo-map">
  <Map>
    <View
      constrainOnlyCenter
      smoothExtentConstraint
      maxZoom={18}
      minZoom={4}
      extent={nzBounds}
      initialView={nzBounds}
    />
    <MapPositioner />
    <LayerGroup title="Base Layers">
      {#each layerDefinitions as definition}
        <TileLayer
          title={definition.name}
          type="base"
          visible={false}
          source={cachingSource(definition)}
        />
      {/each}
    </LayerGroup>
    <LayerGroup title="Features">
      <FeatureLayers />
    </LayerGroup>

    <Controls defaults={['scaleline']}>
      <MapMenu />
      <MapSearch
        on:change={(e) => {
          const [lng, lat] = [e.detail.result.lon, e.detail.result.lat]
          $fragment.label = { lat, lng, text: e.detail.result.name }
        }}
      />
      <MapZoom />
      <MapLocator />
      <MapMeasure />
      <MapDownloader />
      <MapFeatures />
      <MapRotate />
    </Controls>
    <MapLabel />
  </Map>
</div>

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
