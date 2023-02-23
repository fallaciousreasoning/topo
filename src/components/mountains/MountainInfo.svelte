<script lang="ts">
  import mountains from '../../stores/mountains'
  import type { Mountain } from '../../stores/mountains'
  import TopoText from '../TopoText.svelte'

  export let id: string
  $: mountain = $mountains[id] || ({} as Mountain)
</script>

<h1 class="font-bold text-lg">{mountain.name} ({mountain.altitude})</h1>
{#if mountain.image}
  <img class="w-full" alt={mountain.name} src={mountain.image} />
{/if}
{#if mountain.description}
  <span class="font-bold">Access</span>
  <p><TopoText text={mountain.description || ''} /></p>
{/if}
{#if mountain.routes?.length}
  <span class="font-bold mt-4">Routes</span>

  {#each mountain.routes as route}
    <hr />
    <div class="font-bold mt-4">
      {route.name}
      {route.grade && `(${route.grade})`}
      {route.bolts && `${route.bolts} bolts`}
      {route.natural_pro ? 'trad' : ''}
      {route.quality ? `Quality: ${route.quality}` : ''}
    </div>
    <div>
      <TopoText text={route.description} />
    </div>
  {/each}
{/if}
<div>
  <a
    href={mountain.link}
    title={mountain.name}
    target="_blank"
    rel="noopener noreferrer">ClimbNZ</a>
</div>
