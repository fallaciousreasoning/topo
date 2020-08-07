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
  .ol-popup {
    position: absolute;
    background-color: white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    padding: 15px;
    border-radius: 10px;
    border: 1px solid #cccccc;
    bottom: 12px;
    left: -50px;
    min-width: 280px;
  }

  .ol-popup:after,
  .ol-popup:before {
    top: 100%;
    border: solid transparent;
    content: " ";
    height: 0;
    width: 0;
    position: absolute;
    pointer-events: none;
  }
  .ol-popup:after {
    border-top-color: white;
    border-width: 10px;
    left: 48px;
    margin-left: -10px;
  }
  .ol-popup:before {
    border-top-color: #cccccc;
    border-width: 11px;
    left: 48px;
    margin-left: -11px;
  }
</style>

<div use:olOverlay={map} class="ol-popup" bind:this={element}>
  <slot />
</div>
