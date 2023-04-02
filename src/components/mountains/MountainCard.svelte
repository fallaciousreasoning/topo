<script lang="ts">
  import { Mountain } from '../../stores/mountains'
  import { allRoutes } from '../../utils/routes'

  export let mountain: Mountain

  $: routes = allRoutes(mountain)
</script>

<div class="w-full bg-white shadow-md rounded overflow-hidden">
  {#if mountain.image}
    <img class="max-h-64 w-full object-cover object-top" src={mountain.image} />
  {/if}
  <div class="p-2">
    <h3 class="font-bold text-lg">{mountain.name} ({mountain.altitude})</h3>
    <div>
      {mountain.places.length + 1} areas,
      {routes.length + 1} routes
    </div>
  </div>
</div>
