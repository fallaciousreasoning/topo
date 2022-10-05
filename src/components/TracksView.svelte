<script lang="ts">
  import Section from './Section.svelte'
  import { liveQuery } from 'dexie'
  import { db, insertItem, updateItem } from '../db'
  import Button from './Button.svelte'
  import Card from './Card.svelte'
  import Route from './Route.svelte'
  import fragment from '../stores/fragment'
  import type { Track } from '../db/track'
  import { tick } from 'svelte'

  const tracks = liveQuery(() => db.tracks.toArray())
  const deleteTrack = async (track: Track) => {
    if (!window.confirm(`Are you sure you want to delete '${track.name}'?`))
      return

    // If we're currently viewing this track we should stop.
    if ($fragment.page.includes(track.id)) $fragment.page = 'tracks'

    await tick()
    await db.tracks.delete(track.id)
  }
</script>

<Section page="tracks" title="Tracks">
  <div class="w-full border-t border-foreground mt-1" />
  <div class="my-2 flex flex-col gap-2">
    {#if $tracks}
      {#each $tracks as track}
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
                {track.distance}
            </span>
            <div class="flex flex-row gap-2">
              <Button class="" on:click={(e) => deleteTrack(track)}>🗑</Button>
              <Button
                class=""
                on:click={(e) => ($fragment.page = `tracks/${track.id}`)}
                >✎</Button>
            </div>
          </div>
        </Card>
      {/each}
    {/if}
    <Button on:click={async (e) => {
        const track = await insertItem('tracks', { name: 'Untitled Track', points: [], draft: true, created: Date.now(), updated: Date.now(), distance: 0 })
        $fragment.page = `tracks/${track.id}`
    }}>
      Create Track
    </Button>
    <div />
  </div>
</Section>
