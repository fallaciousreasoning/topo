<script lang="ts">
  import { FullScreen, ScaleLine, Rotate, Zoom } from "ol/control";
  import onMountTick from "../utils/onMountTick";
  import { getOlContext } from "./Map.svelte";
  import portal from "../utils/portal";
  import Control from "./Control.svelte";
  import { onMount, setContext } from "svelte";
  import LayerSwitcher from "ol-layerswitcher";
  import "ol-layerswitcher/src/ol-layerswitcher.css";

  type ControlPosition = "topleft" | "topright" | "bottomleft";

  const controls = {
    fullscreen: { control: FullScreen, position: "topright" },
    scaleline: { control: ScaleLine, position: "bottomleft" },
    rotate: { control: Rotate, position: "topright" },
    zoom: { control: Zoom, position: "topleft" },
    layerSwitcher: { control: LayerSwitcher, position: "topright" }
  };
  export let defaults: (keyof typeof controls)[] = ["zoom", "rotate"];
  const { map } = getOlContext();

  let mounted = false;

  let topLeft: HTMLElement;
  let topRight: HTMLElement;
  let bottomLeft: HTMLElement;
  setContext("control-containers", {
    getTopLeft: () => topLeft,
    getTopRight: () => topRight,
    getBottomLeft: () => bottomLeft
  })

  onMount(() => {
    // Add default controls.
    for (const control of defaults) {
      const info = controls[control];
      let target = topLeft;
      if (info.position === "topright")
        target = topRight;
      if (info.position === "bottomleft")
        target = bottomLeft;

      map.addControl(new info.control({ target }));
    }

    mounted = true;
  });
</script>

<style>
  :global(.ol-control) {
    position: initial !important;
  }
</style>

<div class="absolute flex flex-col z-10 m-1 gap-1 top-0 left-0 w-2 items-start top-left" bind:this={topLeft} />
<div class="absolute flex flex-col z-10 m-1 gap-1 top-0 right-0 w-2 items-end top-right" bind:this={topRight} />
<div class="absolute flex flex-row z-10 m-1 gap-1 bottom-0 left-0 h-2 bottom-left" bind:this={bottomLeft} />

{#if mounted}
  <slot/>
{/if}