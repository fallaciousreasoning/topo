<script lang="ts">
    import { Overlay, Map } from "ol";
    import onMountTick from "../utils/onMountTick";
    import { getOlContext } from "./Map.svelte";
    import type { Coordinate } from "ol/coordinate";
  
    export let position: Coordinate;
    const { getMap } = getOlContext();
    let map: Map;
    onMountTick(() => (map = getMap()));
  
    let overlay: Overlay;
    let element: HTMLElement;

    $: overlay && overlay.setPosition(position);
  
    const olOverlay = (node: HTMLElement, map: Map) => {
      const newOverlay = () =>
        new Overlay({
          element,
          autoPan: true,
          autoPanAnimation: { duration: 250 },
          position,
        });
  
      overlay = newOverlay();
      overlay.setPosition(position);
  
      return {
        destroy: () => map && map.removeOverlay(overlay),
        update(newMap) {
          if (map) map.removeOverlay(overlay);
  
          overlay = newOverlay();
          map = newMap;
          map.addOverlay(overlay);
        },
      };
    };
  </script>
  
  <style>
    .ol-overlay {
      position: absolute;
    }
  </style>
  
  <div use:olOverlay={map}
    class="ol-overlay" bind:this={element}>
    <slot overlay={overlay} />
  </div>
  