<script lang="ts">
  import { FullScreen, ScaleLine, Rotate, Zoom } from "ol/control";
  import onMountTick from "../utils/onMountTick";
  import { getOlContext } from "./Map.svelte";
import portal from "../utils/portal";

  type ControlPosition = "topleft" | "topright" | "bottomleft";

  const controls = {
    fullscreen: { control: FullScreen, position: "topright" },
    scaleline: { control: ScaleLine, position: "bottomleft" },
    rotate: { control: Rotate, position: "topright" },
    zoom: { control: Zoom, position: "topleft" },
  };
  export let defaults: (keyof typeof controls)[] = ["zoom", "rotate"];
  const { getMap } = getOlContext();

  let topLeft: HTMLElement;
  let topRight: HTMLElement;

  onMountTick(() => {
    // Add default controls.
    for (const control of defaults) {
      const info = controls[control];
      getMap().addControl(new info.control({ }));
    }
  });
</script>

<style>
  .container {
    display: flex;
    flex-direction: column;
    position: absolute;
  }

  .top-left {
    top: 1em;
    left: 1em;
  }
</style>

<div class="container top-left">
  <slot name="top-left" />
</div>

<div class="container top-right" bind:this={topRight}>
  <slot name="top-right" />
</div>
