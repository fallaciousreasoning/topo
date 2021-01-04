<script context="module" lang="ts">
  import Map from "ol/Map";
  import { getContext } from "svelte";

  interface OlContext {
    map: Map;
    addLayer(layer: BaseLayer): void;
    removeLayer(layer: BaseLayer): void;
  }

  export const getOlContext = (): OlContext => {
    return getContext("ol");
  };
</script>

<script lang="ts">
  import { onMount, setContext } from "svelte";
  import type BaseLayer from "ol/layer/Base";
  import View from "ol/View";
  import { DragRotateAndZoom } from "ol/interaction";

  // A place to store all the layers we try and add before mounting.
  const pendingLayers: BaseLayer[] = [];
  
  const context: OlContext = {
    map: undefined,
    addLayer: (layer: BaseLayer) => context.map.addLayer(layer),
    removeLayer: (layer: BaseLayer) => context.addLayer(layer)
  }
  setContext("ol", context);

  let map: Map;
  let mapRef: HTMLElement;

  onMount(() => {
    map = new Map({
      target: mapRef,
      layers: pendingLayers,
      view: new View(),
      controls: []
    });
    map.addInteraction(new DragRotateAndZoom());
  });
</script>

<div bind:this={mapRef}>
  {#if map}
    <slot />
  {/if}
</div>
