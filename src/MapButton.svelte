<script lang="ts">
  import { Control } from "ol/control";
  import { CLASS_CONTROL, CLASS_UNSELECTABLE } from "ol/css";
  import type { Map } from "ol";
  import portal from "./utils/portal";

  export let top: string = `0.5em`;
  export let left: string = `0.5em`;
  export let bottom: string = undefined;
  export let right: string = undefined;

  export let label: string = "";
  export let map: Map;

  let style = '';
  $: {
    style = '';
    if (top)
      style += 'top: ' + top;
    if (bottom)
      style += 'bottom: ' + bottom;
    if (left)
      style += 'left: ' + left;
    if (right)
      style += 'right: ' + right;
  }

  const control = (node) => {
    if (!map)
      return;

    const control = new Control({ element: node });
    return {
      destroy: () => map.removeControl(control)
    }
  }
</script>

<div
  style={style}
  class={`${CLASS_CONTROL} ${CLASS_UNSELECTABLE}`}
  use:control>
  <button>{label}</button>
</div>
