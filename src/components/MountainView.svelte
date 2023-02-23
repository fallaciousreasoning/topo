<script lang="ts">
  import mountains from '../stores/mountains'
  import MountainInfo from './mountains/MountainInfo.svelte'
  import Route from './Route.svelte'
  import Section from './Section.svelte'
</script>

<Section page="mountains">
  <Route path="mountains/:id" let:params exact>
    <MountainInfo id={decodeURIComponent(params.id)} />
  </Route>
</Section>
