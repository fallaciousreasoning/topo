<script lang="ts">
  import geocode from '../search/geocode'
  import { createEventDispatcher, tick } from 'svelte'
  import { getOlContext } from '../ol/Map.svelte'
  import MapControl from './MapControl.svelte'
  import grow from '../transitions/grow'
  import type { Place } from '../search/places'

  const dispatcher = createEventDispatcher()
  const { map } = getOlContext()

  let searchBox: HTMLInputElement
  $: {
    if (searchBox) {
      searchBox.focus()
    }
  }

  let query = ''

  let open = false
  let results: Place[] = []

  let shouldClose = false
  const close = () => {
    shouldClose = true
    setTimeout(() => {
      if (!shouldClose) return
      open = false
    })
  }

  const updateResults = async (query: string) => {
    try {
      let currentQuery = query
      const queryResults = await geocode(currentQuery)
      if (query === currentQuery) results = queryResults
    } catch {}
  }

  $: {
    updateResults(query)
  }

  const selectResult = (result: Place) => {
    dispatcher('change', { result, map })
    open = false
  }
</script>

<MapControl>
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <div
    tabindex="0"
    on:focusin={(e) => {
      shouldClose = false
      open = true
    }}
    on:focusout={close}
  >
    <div
      class="transition-colors divide-purple-200 flex rounded items-start border ${open &&
        'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary'}"
    >
      <button
        tabindex="-1"
        class={`transition-colors duration-200 map-button flex-shrink-0 ${
          open && 'bg-primary focus:bg-primary-hover hover:bg-primary-hover'
        }`}
      >
        <span class="-mx-2">🔎</span>
      </button>

      {#if open}
        <input
          bind:this={searchBox}
          transition:grow={{ animateHeight: false }}
          class={`${
            !open && 'hidden'
          } h-full py-2 px-2 rounded-l-none appearance-none rounded focus:outline-none`}
          type="search"
          bind:value={query}
        />
      {/if}
    </div>
    {#if open}
      <div class={`max-h-72 overflow-y-auto ${!!results.length && 'mt-1'}`}>
        {#each results.slice(0, 20) as result}
          <div
            class="opacity-95 hover:bg-background-hover px-2 py-1"
            on:click={() => selectResult(result)}
          >
            {result.name}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</MapControl>
