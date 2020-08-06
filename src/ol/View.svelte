<script lang="ts">
  import { getOlContext } from "./Map.svelte";
  import View from "ol/View";
  import type { Coordinate } from "ol/coordinate";
  import type { Extent } from "ol/extent";
  import { onMount, tick } from "svelte";

  export let initialView: Extent;
  export let initialCenter: Coordinate;
  export let initialZoom: number;

  export let maxZoom: number;
  export let minZoom: number;

  export let extent: Extent;
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
