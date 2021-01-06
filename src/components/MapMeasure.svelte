<script lang="ts">
  import DrawTrack from "../tools/DrawTrack.svelte";
  import MapControl from "./MapControl.svelte";

  let measuring = false;
</script>

<MapControl>
  <button
    class={`w-full py-2 px-4 focus:outline-none ease-in rounded border button ${measuring ? 'bg-primary hover:bg-primary-hover text-background' : 'bg-background hover:bg-background-hover text-primary'}`}
    on:click={(e) => (measuring = !measuring)}>
    <span class="-m-2">📏</span>
  </button>
</MapControl>

{#if measuring}
  <DrawTrack />
{/if}
