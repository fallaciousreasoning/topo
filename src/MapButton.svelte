<script lang="ts">
  import { Control } from "ol/control";
  import { CLASS_CONTROL, CLASS_UNSELECTABLE } from "ol/css";
  import type { Map } from "ol";
  import portal from "./utils/portal";
import MapPositioner from "./MapPositioner.svelte";

  export let top: string = `0.5em`;
  export let left: string = `0.5em`;
  export let bottom: string = undefined;
  export let right: string = undefined;

  export let map: Map;

  let style = '';
  $: {
    style = '';
    if (top)
      style += `top: ${top};`;
    if (bottom)
      style += `bottom: ${bottom};`;
    if (left)
      style += `left: ${left};`;
    if (right)
      style += `right: ${right};`;
  }

  const control = (node, map: Map) => {
    const control = new Control({ element: node });
    return {
      destroy: () => map && map.removeControl(control),
      update(newMap) {
        if (map)
          map.removeControl(control);
        map = newMap;
        if (map)
          map.addControl(control);
      }
    }
  }
</script>

<div
  style={style}
  class={`${CLASS_CONTROL} ${CLASS_UNSELECTABLE}`}
  use:control={map}>
  <slot/>
</div>
