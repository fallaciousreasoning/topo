<script lang="ts">
  import { Control } from "ol/control";
  import type Map from "ol/Map";
  import onMountTick from "../utils/onMountTick";
  import { getOlContext } from "./Map.svelte";
  import { CLASS_CONTROL, CLASS_SELECTABLE, CLASS_UNSELECTABLE } from "ol/css";

  export let control: boolean = false;
  export let selectable: boolean = false;
  export let style: string = "";

  const { getMap } = getOlContext();
  let map: Map;
  onMountTick(() => (map = getMap()));

  const olControl = (node, map: Map) => {
    const control = new Control({ element: node });
    return {
      destroy: () => map && map.removeControl(control),
      update(newMap) {
        if (map) map.removeControl(control);
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
