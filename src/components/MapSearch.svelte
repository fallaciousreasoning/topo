<script lang="ts">
  import Control from '../ol/Control.svelte'
  import geocode from "../search/geocode";
  import type { GeocodeResult } from "../search/geocode";
  import { createEventDispatcher } from "svelte";
  import { getOlContext } from "../ol/Map.svelte";
import MapControl from './MapControl.svelte';

  const dispatcher = createEventDispatcher();
  const { map } = getOlContext();

  let query = "";
  let searching = false;
  let results = [];

  const updateResults = async () => {
    try {
      results = await geocode(query);
    } catch {}
  };

  const selectResult = (result: GeocodeResult) => {
    dispatcher('change', { result, map });
    searching = false;
  }
</script>

<style>
  .search-bar {
    display: flex;
    gap: 0.5em;
  }

  .search-bar > input {
    flex: 1;
  }

  .result:hover {
    background: rgba(0.8, 0.8, 0.8, 0.5);
  }
</style>

<MapControl>
  {#if !searching}
    <button on:click={() => (searching = true)}>🔎</button>
  {:else}
    <div>
      <div class="search-bar">
        <input
          class="search-box"
          type="search"
          bind:value={query}
          on:change={updateResults} />
        <button class="clear-button" on:click={() => {
          searching = false;
          query = '';
          results = [];
        }}>
          X
        </button>
      </div>
      <div class="results">
        {#each results as result}
          <div class="result" on:click={() => selectResult(result)}>
            {result.name}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</MapControl>
