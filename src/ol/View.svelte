<script lang="ts">
  import { getOlContext } from "./Map.svelte";
  import View from "ol/View";
  import type { Coordinate } from "ol/coordinate";
  import type { Extent } from "ol/extent";
  import { onMount, tick } from "svelte";

  export let initialView: Extent = undefined;
  export let initialCenter: Coordinate = undefined;
  export let initialZoom: number = undefined;

  export let maxZoom: number = undefined;
  export let minZoom: number = undefined;

  export let extent: Extent = undefined;
  export let constrainOnlyCenter: boolean;
  export let smoothExtentConstraint: boolean;
  const { getMap } = getOlContext();

  const view = new View({
    constrainOnlyCenter: constrainOnlyCenter,
    smoothExtentConstraint: smoothExtentConstraint,

    center: initialCenter,

    zoom: initialZoom,
    maxZoom,
    minZoom,

    extent: extent,
  });

  onMount(() => {
    tick().then(() => {
      getMap().setView(view);

      if (initialView)
        view.fit(initialView);
    });
  });
</script>
