<script lang="ts">
  import { getOlContext } from "../ol/Map.svelte";
import { onMount, tick } from "svelte";
import { getLayers } from ".";
import { enableZoomToCluster } from "../utils/zoomToFeature";

  const { getMap, addLayer, removeLayer } = getOlContext();
  onMount(async () => {
    // Tick, to let stuff initialize.
    await tick();

    enableZoomToCluster(getMap());

    const layers = await getLayers(getMap());
    layers.forEach(l => addLayer(l));

    return () => {
        layers.forEach(l => removeLayer(l));
    }
  });
</script>
