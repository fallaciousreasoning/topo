<script lang="ts">
  import { Control } from "ol/control";
  import type Map from "ol/Map";
  import onMountTick from "../utils/onMountTick";
  import { getOlContext } from "./Map.svelte";
  import { CLASS_CONTROL, CLASS_SELECTABLE, CLASS_UNSELECTABLE } from "ol/css";
  import { getContext } from "svelte";

  export let position: "topleft" | "topright" | "bottomleft" = "topleft";
  export let control: boolean = false;
  export let selectable: boolean = false;
  export let style: string = "";

  const { getMap } = getOlContext();
  const { getTopLeft, getTopRight, getBottomLeft } = getContext(
    "control-containers"
  );
  let map: Map;
  onMountTick(() => (map = getMap()));

  const olControl = (node, map: Map) => {
    let targetSelector = getTopLeft;
    if (position === "topright") targetSelector = getTopRight;
    if (position === "bottomleft") targetSelector = getBottomLeft;

    let control = new Control({ element: node, target: targetSelector() });
    return {
      destroy: () => map && map.removeControl(control),
      update(newMap) {
        if (map) map.removeControl(control);

        control = new Control({ element: node, target: targetSelector() });
        map = newMap;
        if (map) map.addControl(control);
      },
    };
  };
</script>

<div
  {style}
  use:olControl={map}
  class={`${control ? CLASS_CONTROL : ''} ${selectable ? CLASS_SELECTABLE : CLASS_UNSELECTABLE}`}>
  <slot />
</div>
