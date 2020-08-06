<script lang="ts">
  import { FullScreen, ScaleLine, Rotate, Zoom } from "ol/control";
  import onMountTick from "../utils/onMountTick";
  import { getOlContext } from "./Map.svelte";

  const controls = {
    fullscreen: FullScreen,
    scaleline: ScaleLine,
    rotate: Rotate,
    zoom: Zoom,
  };
  export let defaults: (keyof typeof controls)[] = ["zoom", "rotate"];
  const { getMap } = getOlContext();

  onMountTick(() => {
    // Add default controls.
    for (const control of defaults)
      getMap().addControl(new controls[control]());
  });
</script>

<div class="top-left" />

<div class="top-right" />
