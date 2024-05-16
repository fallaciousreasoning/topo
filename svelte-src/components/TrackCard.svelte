<script lang="ts">
  import { db, updateItem } from '../db'
  import type { Track } from '../db/track'
  import { getTrackImportLink } from '../db/track'
  import { friendlyDistance } from '../utils/friendlyUnits'
  import Button from './Button.svelte'
  import Card from './Card.svelte'
  import fragment from '../stores/fragment'
  import { tick } from 'svelte'
  import Chart from 'svelte-frappe-charts'
  import round from '../utils/round'

  export let track: Track

  const deleteTrack = async () => {
    if (!window.confirm(`Are you sure you want to delete '${track.name}'?`))
      return

    // If we're currently viewing this track we should stop.
    if ($fragment.page.includes(track.id)) $fragment.page = 'tracks'

    await tick()
    await db.tracks.delete(track.id)
  }

  const shareTrack = async () => {
    const importLink = await getTrackImportLink(track);
    if (!('share' in navigator)) {
        // Copy to clipboard, nothing else we can do.
        await (navigator as any).clipboard.writeText(importLink);
        return;
    }

    await navigator.share({
        url: importLink
    });
  }
</script>

<Card>
  <div class="flex flex-col gap-1">
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
      <Button
        class=""
        on:click={(e) => shareTrack()}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
          x="0px"
          y="0px"
          width="16"
          height="16"
          viewBox="0 0 98.333 98.333"
          style="enable-background:new 0 0 98.333 98.333;"
          xml:space="preserve">
          <g>
            <path
              d="M81.139,64.48c-4.286,0-8.188,1.607-11.171,4.233l-35.919-18.11c0.04-0.475,0.072-0.951,0.072-1.437   c0-0.432-0.033-0.856-0.064-1.28l36.024-18.164c2.967,2.566,6.828,4.129,11.058,4.129c9.348,0,16.926-7.579,16.926-16.926   C98.064,7.578,90.486,0,81.139,0C71.79,0,64.212,7.578,64.212,16.926c0,0.432,0.033,0.856,0.064,1.28L28.251,36.37   c-2.967-2.566-6.827-4.129-11.057-4.129c-9.348,0-16.926,7.578-16.926,16.926c0,9.349,7.578,16.926,16.926,16.926   c4.175,0,7.992-1.52,10.944-4.026l36.13,18.217c-0.023,0.373-0.057,0.744-0.057,1.124c0,9.348,7.578,16.926,16.926,16.926   s16.926-7.579,16.926-16.926S90.486,64.48,81.139,64.48z" />
          </g>
        </svg></Button>
    </div>
    {#if track.elevations}
      <div class="chart">
        <Chart
          type="line"
          axisOptions={{
            xIsSeries: true,
            xAxisMode: 'tick',
            shortenYAxisNumbers: true,
          }}
          lineOptions={{ regionFill: 1, hideDots: true }}
          height={150}
          tooltipOptions={{
            formatTooltipX: (d) => `→ ${friendlyDistance(d)}`,
            formatTooltipY: (d) => `↑ ${d}m`,
          }}
          data={{
            labels: track.elevations.map((h) =>
              round(h.percent * track.distance, 0)
            ),
            datasets: [{ values: track.elevations.map((h) => h.elevation) }],
          }} />
      </div>
    {/if}
  </div>
</Card>
