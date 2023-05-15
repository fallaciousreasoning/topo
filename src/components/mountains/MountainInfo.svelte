<script lang="ts">
  import mountains from '../../stores/mountains'
  import type { Mountain } from '../../stores/mountains'
  import PlaceInfo from './PlaceInfo.svelte'

  export let id: string;
  export let route: string = undefined;

  $: mountain = $mountains[id] || ({} as Mountain)
  $: places = mountain.places ?? []
  $: console.log(id, route)
</script>

<PlaceInfo {mountain} />
{#each places as place}
  <hr />
  <PlaceInfo mountain={place} />
{/each}
<div>
  <a
    href={mountain.link}
    title={mountain.name}
    target="_blank"
    rel="noopener noreferrer">ClimbNZ</a>
</div>
