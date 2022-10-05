<script lang="ts">
  import MapControl from './MapControl.svelte'
  import fragment from '../stores/fragment'

  const toggleMenu = () => {
    if ($fragment.page === 'settings') {
      history.go(-1)
    } else {
      fragment.update((p) => ({ ...p, page: 'settings' }))
    }
  }
</script>

<MapControl>
  <div class="flex flex-col">
    <button class="map-button rounded-b-none" on:click={(e) => toggleMenu()}
      >☰</button
    >
  </div>
</MapControl>
