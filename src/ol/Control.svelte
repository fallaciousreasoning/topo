<script lang="ts">
  import { Control } from "ol/control";
  import { getOlContext } from "./Map.svelte";
  import { CLASS_CONTROL, CLASS_SELECTABLE, CLASS_UNSELECTABLE } from "ol/css";
  import { getContext } from "svelte";

  export let position: "topleft" | "topright" | "bottomleft" = "topleft";
  export let control: boolean = false;
  export let selectable: boolean = false;
  export let style: string = "";

  const { map } = getOlContext();
  const { getTopLeft, getTopRight, getBottomLeft } = getContext(
    "control-containers"
  );

  const olControl = (node) => {
    let targetSelector = getTopLeft;
    if (position === "topright") targetSelector = getTopRight;
    if (position === "bottomleft") targetSelector = getBottomLeft;

    const control = new Control({ element: node, target: targetSelector() });
    map.addControl(control);

    return {
      destroy: () => map.removeControl(control),
    };
  };
</script>

<div
  {style}
  use:olControl
  class={`${control ? CLASS_CONTROL : ''} ${selectable ? CLASS_SELECTABLE : CLASS_UNSELECTABLE} flex-none`}>
  <slot />
</div>
