<script lang="ts">
  import DrawTrack from "../tools/DrawTrack.svelte";
  import MapControl from "./MapControl.svelte";

  let measuring = false;
</script>

<MapControl>
  <button
    class={`map-button ${measuring && 'bg-primary hover:bg-primary-hover text-background'}`}
    on:click={(e) => (measuring = !measuring)}>
    <span class="-m-2">📏</span>
  </button>
</MapControl>

{#if measuring}
  <DrawTrack />
{/if}
