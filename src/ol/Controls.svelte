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

  .bottom-left {
    bottom: 0;
    left: 0;
    height: 2em;
    flex-direction: row;
  }

  :global(.ol-control) {
    position: initial !important;
    flex: 0;
  }
</style>

<div class="container top-left" bind:this={topLeft} />
<div class="container top-right" bind:this={topRight} />
<div class="container bottom-left" bind:this={bottomLeft} />
<slot/>