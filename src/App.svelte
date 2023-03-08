<script lang="ts">
  import ImportTrack from './components/ImportTrack.svelte'
  import MenuView from './components/MenuView.svelte'
    import MountainView from './components/MountainView.svelte'
  import Route from './components/Route.svelte'
  import SettingsView from './components/SettingsView.svelte'
  import TracksView from './components/TracksView.svelte'
  import TopoMap from './TopoMap.svelte'
</script>

<TopoMap />
<MenuView />
<SettingsView />
<TracksView />
<MountainView/>
<Route path="importTrack/:data" let:params>
  <ImportTrack data={params.data} />
</Route>
