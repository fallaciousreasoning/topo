<script lang="ts">
  import Control from "../ol/Control.svelte";
  import geocode from "../search/geocode";
  import type { GeocodeResult } from "../search/geocode";
  import { createEventDispatcher, tick } from "svelte";
  import { getOlContext } from "../ol/Map.svelte";
  import MapControl from "./MapControl.svelte";
  import grow from "../transitions/grow";

  const dispatcher = createEventDispatcher();
  const { map } = getOlContext();

  let searchBox: HTMLInputElement;
  $: {
    if (searchBox) {
      searchBox.focus();
    }
  }

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
    tabindex=0
    on:focusin={(e) => searching = true}
    on:focusout={(e) => searching = false}>
    <div
      class="flex rounded items-start border ${searching && 'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary'}">
      <button
        class={`transition-colors map-button flex-shrink-0 ${searching && 'bg-primary focus:bg-primary-hover hover:bg-primary-hover'}`}>
        <span class="-mx-2">🔎</span>
      </button>

      {#if searching}
        <input
          bind:this={searchBox}
          transition:grow={{ animateHeight: false }}
          class={`${!searching && 'hidden'} h-full py-2 px-2 rounded-l-none appearance-none rounded focus:outline-none`}
          type="search"
          bind:value={query}
          on:change={updateResults} />
      {/if}
    </div>
    {#if searching}
      <div class={`max-h-72 overflow-y-auto ${!!results.length && 'mt-1'}`}>
        {#each results as result}
          <div
            class="opacity-95 hover:bg-background-hover"
            on:click={() => selectResult(result)}>
            {result.name}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</MapControl>
