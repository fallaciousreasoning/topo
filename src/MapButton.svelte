<script lang="ts">
  import { Control } from "ol/control";
  import { CLASS_CONTROL, CLASS_UNSELECTABLE } from "ol/css";
  import type { Map } from "ol";
  import portal from "./utils/portal";

  export let top: string = `0.5em`;
  export let label: string = "";
  export let map: Map;

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
  style={`top: ${top}; left: 0.5em`}
  class={`${CLASS_CONTROL} ${CLASS_UNSELECTABLE}`}
  use:control>
  <button>{label}</button>
</div>
