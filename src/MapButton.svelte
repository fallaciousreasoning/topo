<script lang="ts">
  import { CLASS_CONTROL, CLASS_UNSELECTABLE } from "ol/css";
  import Control from "./ol/Control.svelte";

  export let top: string = `0.5em`;
  export let left: string = `0.5em`;
  export let bottom: string = undefined;
  export let right: string = undefined;

  let style = "";
  $: {
    style = "";
    if (top) style += `top: ${top};`;
    if (bottom) style += `bottom: ${bottom};`;
    if (left) style += `left: ${left};`;
    if (right) style += `right: ${right};`;
  }
</script>

<Control control {style}>
    <slot />
</Control>
