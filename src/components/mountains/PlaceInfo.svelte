<script lang="ts">
  import type { Mountain } from '../../stores/mountains'
  import TopoText from '../TopoText.svelte'
  import RouteInfo from './RouteInfo.svelte'
  import { scrollTo } from '../../directives/scrollTo';

  export let mountain: Mountain
  export let scrollToRoute: string | undefined = undefined
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
  <hr class="mb-4" />
    <div use:scrollTo={scrollToRoute === route.name}>
      <RouteInfo {route} />
    </div>
  {/each}
{/if}
