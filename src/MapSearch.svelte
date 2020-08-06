<script lang="ts">
  import type { Map } from "ol";
  import MapButton from "./MapButton.svelte";

  let searching = false;
</script>

<style>
  .search-bar {
    display: flex;
    gap: 0.5em;
  }

  .search-box {
    flex: 1;
  }
</style>

<MapButton top="6.75em">
  {#if !searching}
    <button on:click={() => (searching = true)}>🔎</button>
  {:else}
    <div>
      <div class="search-bar">
        <input class="search-box" type="search" />
        <button class="clear-button" on:click={() => (searching = false)}>
          X
        </button>
      </div>
      <div classname="results">
        <div>Result 1</div>
        <div>Result 2</div>
      </div>
    </div>
  {/if}
</MapButton>
