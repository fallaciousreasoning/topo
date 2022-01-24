<script lang="ts">
  import Overlay from "./ol/Overlay.svelte";
  import type { Coordinate } from "ol/coordinate";

  export let width: number = 30;
  export let height: number = 30;
  export let src = "/icons/marker.svg";
  export let position: Coordinate;
</script>

<Overlay {position} autoPan={false}>
  <div
    class="marker"
    style="position: absolute; left: -{width / 2}px; top: -{height}px">
    <img {width} {height} {src} alt="A marker" />
  </div>
</Overlay>
