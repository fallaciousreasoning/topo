<script lang="ts">
  import { getOlContext } from "./Map.svelte";
  import { onMount, setContext } from "svelte";
  import VectorLayer from "ol/layer/Vector";
  import VectorSource from "ol/source/Vector";
  import { Feature } from "ol";

  export let source = new VectorSource({ features: [] });
  const { addLayer, removeLayer } = getOlContext();

  const layer = new VectorLayer({
    source,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
  });

  onMount(() => {
    addLayer(layer);
    return () => removeLayer(layer);
  });

  setContext("vector-layer", {
    addFeature: (feature: Feature) => source.addFeature(feature),
    removeFeature: (feature: Feature) => source.removeFeature(feature),
  });
</script>

<slot />
