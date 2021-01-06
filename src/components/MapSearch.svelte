<script lang="ts">
  import Control from "../ol/Control.svelte";
  import geocode from "../search/geocode";
  import type { GeocodeResult } from "../search/geocode";
  import { createEventDispatcher } from "svelte";
  import { getOlContext } from "../ol/Map.svelte";
  import MapControl from "./MapControl.svelte";

  const dispatcher = createEventDispatcher();
  const { map } = getOlContext();

  let searchBox: HTMLInputElement;

  let query = "";
  let searching = false;
  let results = [];

  const updateResults = async () => {
    try {
      results = await geocode(query);
    } catch {}
  };

  const selectResult = (result: GeocodeResult) => {
    dispatcher("change", { result, map });
    searching = false;
  };
</script>

<style>
  .result:hover {
    background: rgba(0.8, 0.8, 0.8, 0.5);
  }
</style>

<MapControl>
  <div
    class="flex rounded items-start border ${searching && 'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary'}">
    <button
      class={`map-button flex-shrink-0 ${searching && 'bg-primary focus:bg-primary-hover'}`}
      on:click={() => {
        searching = !searching;
        if (searching) searchBox.focus();
      }}>
      <span class="-mx-2">🔎</span>
    </button>
    <input
      on:blur={(e) => {
        searching = false;
        e.preventDefault();
      }}
      bind:this={searchBox}
      class={`${!searching && 'hidden'} h-full py-2 px-2 rounded-l-none appearance-none rounded focus:outline-none`}
      type="search"
      bind:value={query}
      on:change={updateResults} />
  </div>
  {#if searching}
    <div class={`max-h-72 overflow-y-auto ${!!results.length && 'mt-1'}`}>
      {#each results as result}
        <div class="opacity-95 hover:bg-background-hover" on:click={() => selectResult(result)}>
          {result.name}
        </div>
      {/each}
    </div>
  {/if}
</MapControl>
