<script lang="ts">
  import Control from "../ol/Control.svelte";
  import DrawTrack from "../tools/DrawTrack.svelte";

  let measuring = false;
</script>

<style>
  .measuring {
    background: white;
  }
</style>

<Control control>
  <button
    class={measuring && 'measuring'}
    on:click={(e) => (measuring = !measuring)}>
    📏
  </button>
</Control>

{#if measuring}
  <DrawTrack />
{/if}
