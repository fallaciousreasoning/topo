<script lang="ts">
  import RoutesFilter from './mountains/RoutesFilter.svelte'
  import Route from './Route.svelte'
  import Section from './Section.svelte'
</script>

<Section page="routes">
  <Route path="routes" exact>
    <RoutesFilter />
  </Route>
</Section>
