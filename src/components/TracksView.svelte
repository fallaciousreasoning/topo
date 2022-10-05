<script lang="ts">
  import Section from './Section.svelte'
  import { liveQuery } from 'dexie'
  import { db, insertItem } from '../db'
  import Button from './Button.svelte'
  import fragment from '../stores/fragment'
  import TrackCard from './TrackCard.svelte'
  import { isMobile } from '../stores/mediaQueries'

  const tracks = liveQuery(() =>
    db.tracks.orderBy('updated').reverse().toArray()
  )
</script>

<Section page="tracks" title="Tracks" exact={$isMobile}>
  <div class="w-full border-t border-foreground mt-1" />
  <div class="my-2 flex flex-col gap-2">
    {#if $tracks}
      {#each $tracks as track}
        <TrackCard {track} />
      {/each}
    {/if}
    <Button
      on:click={async (e) => {
        const track = await insertItem('tracks', {
          name: 'Untitled Track',
          points: [],
          draft: true,
          created: Date.now(),
          updated: Date.now(),
          distance: 0,
        })
        $fragment.page = `tracks/${track.id}`
      }}>
      Create Track
    </Button>
    <div />
  </div>
</Section>
