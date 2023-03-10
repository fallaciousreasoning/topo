<script lang="ts">
  import type { Mountain } from '../../stores/mountains'
  import TopoText from '../TopoText.svelte'
  import { repeatString } from '../../utils/array'

  export let mountain: Mountain
</script>

<h1 class="font-bold text-lg">
  {mountain.name}{mountain.altitude ? ` (${mountain.altitude})` : ''}
</h1>
{#if mountain.image}
  <a target="_blank" href={mountain.image} rel="noopener noreferrer">
    <img class="w-full" alt={mountain.name} src={mountain.image} />
  </a>
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
      {repeatString('★', route.quality)}
    </div>
    {#if route.image}
    <a target="_blank" rel="noopener noreferrer" href={route.image}>
        <img class="w-full" alt={route.name} src={route.image}/>
    </a>
    {/if}
    <div>
      <TopoText text={route.description} />
    </div>
    <ol class="list-decimal ml-8">
        {#each route.pitches as pitch}
            <li>
                {pitch.ewbank} {pitch.alpine} {pitch.commitment} {pitch.mtcook} {pitch.aid} {pitch.ice} {pitch.mixed} ({pitch.length})
                <TopoText text={pitch.description}/>
            </li>
        {/each}
      </ol>
  {/each}
{/if}
