<script lang="ts">
  import Section from './Section.svelte'
  import { liveQuery } from 'dexie'
  import { db, updateItem } from '../db'
    import Button from './Button.svelte'

  const tracks = liveQuery(() => db.tracks.toArray())
</script>

<Section page="tracks" title="Tracks">
  <div class="w-full border-t border-foreground mt-1" />
  <div>
    {#if $tracks}
      {#each $tracks as track}
        <div class="bg-white flex flex-col p-2 my-1 gap-1 rounded shadow">
          <span><span class="font-semibold">Id:</span> {track.id}</span>
          <span>
            <span class="font-semibold">Name:</span>
            <input value={track.name} on:input={e => updateItem('tracks', track.id, { name: e.target['value'] })}/>
          </span>
          <span><span class="font-semibold">Points:</span> {track.points.length}</span>
          <div class="flex flex-row gap-2">
            <Button class='' on:click={e => window.confirm('Are you sure?') && db.tracks.delete(track.id)}>🗑</Button>
            <Button class=''>✎</Button>
          </div>
        </div>
      {/each}
    {/if}
    <div />
  </div></Section
>
