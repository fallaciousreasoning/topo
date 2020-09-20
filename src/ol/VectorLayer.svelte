<script lang="ts">
  import { getOlContext } from "./Map.svelte";
  import { onMount, setContext } from "svelte";
  import VectorLayer from "ol/layer/Vector";
  import VectorSource from "ol/source/Vector";
  import { Feature } from "ol";
  import type { StyleLike } from "ol/style/Style";

  export let source = new VectorSource({ features: [] });
  export let style: StyleLike = undefined;
  export let title: string = undefined;
  export let visible: boolean = true;

  const { addLayer, removeLayer } = getOlContext();

  const layer = new VectorLayer({
    source,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
    style,
    ["title" as any]: title,
    visible,
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
