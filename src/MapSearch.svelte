<script lang="ts">
  import type { Map } from "ol";
  import MapButton from "./MapButton.svelte";
  import geocode from "./search/geocode";
  import type { GeocodeResult } from "./search/geocode";

  let query = "";
  let searching = false;
  let results = [];

  const updateResults = async () => {
    try {
      results = await geocode(query);
    } catch {}
  };
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
        <input
          class="search-box"
          type="search"
          bind:value={query}
          on:change={updateResults} />
        <button class="clear-button" on:click={() => (searching = false)}>
          X
        </button>
      </div>
      <div class="results">
        {#each results as result}
          <div class="result">{result.displayName}</div>
        {/each}
      </div>
    </div>
  {/if}
</MapButton>
