<script lang="ts">
  import { FullScreen, ScaleLine, Rotate, Zoom } from "ol/control";
  import onMountTick from "../utils/onMountTick";
  import { getOlContext } from "./Map.svelte";
  import portal from "../utils/portal";
  import Control from "./Control.svelte";

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
      const target = info.position === "topleft"
        ? topLeft
        : topRight;
      getMap().addControl(new info.control({ target }));
    }
  });
</script>

<style>
  .container {
    display: flex;
    flex-direction: column;
    position: absolute;
    z-index: 10;
    margin: 1em;
    gap: 0.5em;
  }

  .top-right {
    top: 0;
    right: 0;
    width: 2em;
    align-items: flex-end;
  }

  .top-left {
    top: 0;
    left: 0;
    width: 2em;
    align-items: flex-start;
  }

  :global(.ol-control) {
    position: initial !important;
    flex: 0;
  }
</style>

<div class="container top-left" bind:this={topLeft}>
  <slot name="top-left" />
</div>

<div class="container top-right" bind:this={topRight}>
  <slot name="top-right" />
</div>
