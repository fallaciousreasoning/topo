<script lang="ts">
  import { Map } from "ol";
  import onMountTick from "../utils/onMountTick";
  import { getOlContext } from "./Map.svelte";
  import type { Coordinate } from "ol/coordinate";
  import Overlay from "./Overlay.svelte";
	import { createEventDispatcher } from 'svelte';

  export let position: Coordinate;
  export let closable: boolean = true;
  export let autoPan: boolean = false;

	const dispatch = createEventDispatcher();
</script>

<style>
  .ol-popup {
    bottom: 12px;
    left: -52px;
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
</style>

<!-- svelte-ignore a11y-missing-content -->
<Overlay {position} {autoPan} let:overlay>
  <div class="ol-popup absolute shadow-lg bg-white rounded-md p-4 pt-6 max-w-5xl w-48 border-gray-500">
    {#if closable}
      <a
        href="#close"
        alt="close"
        class="absolute top-1 right-1 select-none"
        on:click={(e) => {
          e.preventDefault();
          if (!overlay) return;
          overlay.setPosition(undefined);
          dispatch('close')
        }}>✖</a>
    {/if}
    <slot />
  </div>
</Overlay>
