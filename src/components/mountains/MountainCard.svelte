<script lang="ts">
  import { Mountain } from '../../stores/mountains'
  import { allRoutes, getPicture } from '../../utils/routes'
  import Card from '../Card.svelte'

  export let mountain: Mountain

  $: routes = allRoutes(mountain)
  $: imageUrl = getPicture(mountain)
</script>

<Card {imageUrl}>
  <span slot="title">{mountain.name} ({mountain.altitude})</span>
  <div>
    {mountain.places.length + 1} areas,
    {routes.length + 1} routes
  </div>
</Card>
