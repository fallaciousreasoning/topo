<script lang="ts">
  import { db, updateItem } from '../db'
  import type { Track } from '../db/track'
  import { friendlyDistance } from '../utils/friendlyUnits'
  import Button from './Button.svelte'
  import Card from './Card.svelte'
  import fragment from '../stores/fragment'
  import { tick } from 'svelte'

  export let track: Track

  const deleteTrack = async () => {
    if (!window.confirm(`Are you sure you want to delete '${track.name}'?`))
      return

    // If we're currently viewing this track we should stop.
    if ($fragment.page.includes(track.id)) $fragment.page = 'tracks'

    await tick()
    await db.tracks.delete(track.id)
  }
</script>

<Card>
  <div class="flex flex-col gap-1">
    <span><span class="font-semibold">Id:</span> {track.id}</span>
    <span>
      <span class="font-semibold">Name:</span>
      <input
        value={track.name}
        on:input={(e) =>
          updateItem('tracks', track.id, {
            name: e.target['value'],
          })} />
    </span>
    <span>
      <span class="font-semibold">Points:</span>
      {track.points.length}
    </span>
    <span>
      <span class="font-semibold">Distance:</span>
      {friendlyDistance(track.distance)}
    </span>
    <div class="flex flex-row gap-2">
      <Button class="" on:click={(e) => deleteTrack()}>🗑</Button>
      <Button class="" on:click={(e) => ($fragment.page = `tracks/${track.id}`)}
        >✎</Button>
    </div>
  </div>
</Card>
