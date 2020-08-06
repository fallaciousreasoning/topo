<script lang="ts">
  import { Control } from "ol/control";
  import type Map from "ol/Map";
  import onMountTick from "../utils/onMountTick";
  import { getOlContext } from "./Map.svelte";

  const { getMap } = getOlContext();
  let map: Map;
  onMountTick(() => (map = getMap()));

  const control = (node, map: Map) => {
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

<div use:control={map}>
  <slot/>
</div>
