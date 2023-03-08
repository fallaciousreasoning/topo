<script lang="ts">
  import Section from './Section.svelte'
  import fragment from '../stores/fragment'
</script>

<Section page="menu" title="Menu">
  <div class="w-full border-t border-foreground mt-1" />
  <div class="flex flex-col items-start">
  <button on:click={(e) => fragment.update((s) => ({ ...s, page: 'settings' }))}>
    Settings
  </button>
  <button on:click={(e) => fragment.update((s) => ({ ...s, page: 'tracks' }))}>
    Tracks
  </button>
  <button on:click={(e) => fragment.update((s) => ({ ...s, page: 'mountains' }))}>
    Mountains
  </button>
</div>
</Section>
