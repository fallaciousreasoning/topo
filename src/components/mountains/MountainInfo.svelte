<script lang="ts">
  import mountains from '../../stores/mountains'
  import type { Mountain } from '../../stores/mountains'

  export let id: string
  $: mountain = $mountains[id] || ({} as Mountain)
</script>

<h1 class="font-bold text-lg">{mountain.name} ({mountain.altitude})</h1>
{#if mountain.image}
  <img class="w-full" alt={mountain.name} src={mountain.image} />
{/if}
{#if mountain.description}
  <span class="font-bold">Access</span>
  <p>{mountain.description || ''}</p>
{/if}
{#if mountain.routes?.length}
  <span class="font-bold">Routes</span>

  {#each mountain.routes as route}
    <div>
      {route.name}
      {route.grade && `(${route.grade})`}
      {route.bolts && `${route.bolts} bolts`}
      {route.natural_pro ? 'trad' : ''}
      {route.quality ? `Quality: ${route.quality}` : ''}
    </div>
    <div>
        {route.description}
    </div>
  {/each}
{/if}
<div>
  <a
    class="text-blue-500 hover:text-blue-700 underline"
    href={mountain.link}
    title={mountain.name}
    target="_blank"
    rel="noopener noreferrer">ClimbNZ</a>
</div>
