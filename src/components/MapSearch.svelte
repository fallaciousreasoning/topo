<script lang="ts">
  import Control from "../ol/Control.svelte";
  import geocode from "../search/geocode";
  import type { GeocodeResult } from "../search/geocode";
  import { createEventDispatcher, tick } from "svelte";
  import { getOlContext } from "../ol/Map.svelte";
  import MapControl from "./MapControl.svelte";
  import grow from "../transitions/grow";
  import { debounce } from "../utils/debounce";
  import Spinner from "./Spinner.svelte";
  import {nameIsMatch } from '../search/match';

  const dispatcher = createEventDispatcher();
  const { map } = getOlContext();

  let searchBox: HTMLInputElement;
  $: {
    if (searchBox) {
      searchBox.focus();
    }
  }

  let query = "";
  let debouncedQuery = query;

  let open = false;
  let results: GeocodeResult[] = [];
  $: filteredResults = results.filter(r => nameIsMatch(r.name, query));

  let shouldClose = false;
  const close = () => {
    shouldClose = true;
    setTimeout(() => {
      if (!shouldClose) return;
      open = false;
    });
  };

  const debouncedOnlineSearch = debounce(async () => {
    try {
      results = await geocode(query);
    } catch {}
    searching = false;
    debouncedQuery = query;
  }, 500);

  $: searching = debouncedQuery !== query;
  $: {
    if (debouncedQuery !== query)
      debouncedOnlineSearch();
  }

  const selectResult = (result: GeocodeResult) => {
    dispatcher("change", { result, map });
    open = false;
  };
</script>

<MapControl>
  <div
    tabindex="0"
    on:focusin={(e) => {
      shouldClose = false;
      open = true;
    }}
    on:focusout={close}>
    <div
      class="transition-colors divide-purple-200 flex rounded items-start border ${open && 'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary'}">
      {#if !searching}
      <button
        tabindex="-1"
        class={`transition-colors duration-200 map-button flex-shrink-0 ${open && 'bg-primary focus:bg-primary-hover hover:bg-primary-hover'}`}>
          <span class="-mx-2">🔎</span>
      </button>
      {:else}
        <div class="w-11 bg-primary rounded">
          <Spinner class="text-background"/>
        </div>
      {/if}

      {#if open}
        <input
          bind:this={searchBox}
          transition:grow={{ animateHeight: false }}
          class={`${!open && 'hidden'} h-full py-2 px-2 rounded-l-none appearance-none rounded focus:outline-none`}
          type="search"
          bind:value={query} />
      {/if}
    </div>
    {#if open}
      <div class={`max-h-72 overflow-y-auto ${!!filteredResults.length && 'mt-1'}`}>
        {#each filteredResults.slice(0, 20) as result}
          <div
            class="opacity-95 hover:bg-background-hover px-2 py-1"
            on:click={() => selectResult(result)}>
            {result.name}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</MapControl>
