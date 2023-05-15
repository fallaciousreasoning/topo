<script lang="ts">
  import mountains from '../stores/mountains'
  import MountainInfo from './mountains/MountainInfo.svelte'
  import MountainsFilter from './mountains/MountainsFilter.svelte'
  import Route from './Route.svelte'
  import Section from './Section.svelte'
</script>

<Section page="mountains">
  <Route path="mountains/:id/:route?" let:params>
    <MountainInfo
      id={decodeURIComponent(params.id)}
      route={decodeURIComponent(params.route)} />
  </Route>
  <Route path="mountains" exact>
    <MountainsFilter />
  </Route>
</Section>
