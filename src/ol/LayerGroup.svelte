<script lang="ts">
  import { setContext, onMount, onDestroy, getContext } from "svelte";
  import LayerGroup from "ol/layer/Group";
  import type Layer from "ol/layer/Layer";
  import type BaseLayer from "ol/layer/Base";
  import { getOlContext } from "./Map.svelte";
  export let title: string = undefined;

  const layerGroup = new LayerGroup({
    ["title" as any]: title,
    layers: [],
  });

  const { getMap, addLayer, removeLayer } = getOlContext();

  // Make sure we add child layers to this one.
  setContext("ol", {
    getMap,
    addLayer: (layer: BaseLayer) => layerGroup.getLayers().push(layer),
    removeLayer: (layer: BaseLayer) => layerGroup.getLayers().remove(layer),
  });

  onMount(() => {
    addLayer(layerGroup);
    return () => removeLayer(layerGroup);
  });
</script>

<slot />
