<script lang="ts">
    import { Overlay, Map } from "ol";
    import { getOlContext } from "./Map.svelte";
    import type { Coordinate } from "ol/coordinate";
  
    export let position: Coordinate;
    export let autoPan: boolean | undefined;

    const { map } = getOlContext();
  
    let overlay: Overlay;
    $: overlay && overlay.setPosition(position);
  
    const olOverlay = (node: HTMLElement) => {
      const newOverlay = () =>
        new Overlay({
          element: node,
          position,
          autoPan
        });
  
      overlay = newOverlay();
      overlay.setPosition(position);
      map.addOverlay(overlay);
  
      return {
        destroy: () => map.removeOverlay(overlay),
      };
    };
  </script>
  
  <style>
    .ol-overlay {
      position: absolute;
    }
  </style>
  
  <div use:olOverlay
    class="ol-overlay">
    <slot overlay={overlay} />
  </div>
  