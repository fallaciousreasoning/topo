<script lang="ts">
  import DrawTrack from '../tools/DrawTrack.svelte'
  import MapControl from './MapControl.svelte'
  import Route from './Route.svelte'
  import fragment from '../stores/fragment'

  $: drawing = $fragment.page?.startsWith('track')
</script>

<MapControl>
  <button
    class={`map-button ${drawing && 'bg-primary hover:bg-primary-hover text-background'}`}
    on:click={(e) => ($fragment.page = 'tracks')}>
    <span class="-m-2">📏</span>
  </button>
</MapControl>

<Route path="tracks/:trackId" let:params>
  <DrawTrack trackId={params.trackId} />
</Route>
