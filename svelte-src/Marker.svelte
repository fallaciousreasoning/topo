<script lang="ts">
  import Overlay from "./ol/Overlay.svelte";
  import type { Coordinate } from "ol/coordinate";

  const aspectRatio = 3/4;
  export let width: number = 30;
  export let height: number = width/aspectRatio;
  export let position: Coordinate;
  export let color: string = 'text-primary'; // A tailwind color
</script>

<Overlay {position} autoPan={false}>
  <div
    class="marker fill-primary {color}"
    style="position: absolute; left: -{width / 2}px; width: {width}px; height: {height}px; top: -{height}px">
    <svg aria-hidden="true" focusable="false" data-icon="map-marker" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="currentColor" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"></path></svg>
  </div>
</Overlay>
