<script lang="ts">
  import { type Route } from '../../stores/mountains'
  import { repeatString } from '../../utils/array'
  import TopoText from '../TopoText.svelte'
  import Pitches from './Pitches.svelte'
  import RouteAttribution from './RouteAttribution.svelte'

  export let route: Route
</script>

<div class="font-bold">
  {route.name}
  {route.grade && `(${route.grade})`}
  {route.bolts && `${route.bolts} bolts`}
  {route.natural_pro ? 'trad' : ''}
  {repeatString('★', route.quality)}
</div>
{#if route.image}
  <a target="_blank" rel="noopener noreferrer" href={route.image}>
    <img
      class="h-64 w-full object-cover object-scale"
      alt={route.name}
      src={route.image} />
  </a>
{/if}
<div>
  <TopoText text={route.description} />
</div>

<Pitches pitches={route.pitches} />
<RouteAttribution {route} />
