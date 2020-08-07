<script lang="ts">
  import { Map } from "ol";
  import onMountTick from "../utils/onMountTick";
  import { getOlContext } from "./Map.svelte";
  import type { Coordinate } from "ol/coordinate";
  import Overlay from "./Overlay.svelte";

  export let position: Coordinate;
</script>

<style>
  .ol-popup {
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

  .ol-popup-closer {
    text-decoration: none;
    position: absolute;
    top: 2px;
    right: 8px;
  }
  .ol-popup-closer:after {
    content: "✖";
  }
</style>

<Overlay {position} let:overlay>
    <div class="ol-popup">
    <a href="#close" alt="close" class="ol-popup-closer"
        on:click={e => {
            e.preventDefault();

            if (!overlay)
                return;

            overlay.setPosition(undefined);
        }}> </a>
    <slot />
    </div>
</Overlay>
