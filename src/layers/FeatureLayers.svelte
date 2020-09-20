<script lang="ts">
  import { getOlContext } from "../ol/Map.svelte";
  import { onMount, tick } from "svelte";
  import { enableZoomToCluster } from "../utils/zoomToFeature";
  import ClusterLayer from "../ol/ClusterLayer.svelte";
  import huts from "./huts";
  import liveWeather from "./liveWeather";
  import VectorLayer from "../ol/VectorLayer.svelte";
  import VectorSource from "ol/source/Vector";
  import onMountTick from "../utils/onMountTick";

  const { getMap, addLayer, removeLayer } = getOlContext();
  onMountTick(async () => {
    enableZoomToCluster(getMap());
  });
</script>

{#await huts.getFeatures() then hutFeatures}
  <ClusterLayer
    title="Huts"
    visible={false}
    features={hutFeatures}
    style={huts.style} />
{/await}

{#await liveWeather.getFeatures() then liveWeatherFeatures}
  <VectorLayer
    title="Live Weather"
    visible={true}
    on:featureClick={(e) => liveWeather.onClick(e.detail.feature)}
    source={new VectorSource({ features: liveWeatherFeatures })} />
{/await}
