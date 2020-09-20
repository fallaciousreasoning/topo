<script lang="ts">
  import { getOlContext } from "../ol/Map.svelte";
  import { onMount, tick } from "svelte";
  import { getLayers } from ".";
  import { enableZoomToCluster } from "../utils/zoomToFeature";
  import ClusterLayer from "../ol/ClusterLayer.svelte";
  import huts from "./huts";

  const { getMap, addLayer, removeLayer } = getOlContext();
  onMount(async () => {
    // Tick, to let stuff initialize.
    await tick();

    enableZoomToCluster(getMap());

    const layers = await getLayers(getMap());
    layers.forEach((l) => addLayer(l));

    return () => {
      layers.forEach((l) => removeLayer(l));
    };
  });
</script>

{#await huts.getFeatures() then hutFeatures}
  <ClusterLayer
    title="Huts"
    visible={true}
    features={hutFeatures}
    style={huts.style} />
{/await}
