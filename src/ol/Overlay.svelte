<script lang="ts">
    import { Overlay, Map } from "ol";
    import { getOlContext } from "./Map.svelte";
    import type { Coordinate } from "ol/coordinate";
  
    export let position: Coordinate;
    export let autoPan: boolean;

    const { map } = getOlContext();
  
    let overlay: Overlay;
    let element: HTMLElement;

    $: overlay && overlay.setPosition(position);
  
    const olOverlay = (node: HTMLElement, map: Map) => {
      const newOverlay = () =>
        new Overlay({
          element,
          position,
          autoPan
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
  