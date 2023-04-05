<script lang="ts">
  import fragment from '../../stores/fragment'
  import mountains, { Mountain, Route } from '../../stores/mountains'
  import { allRoutes, getPicture } from '../../utils/routes'
  import MountainCard from './MountainCard.svelte'
  import VirtualList from '@sveltejs/svelte-virtual-list'
  import SortyBy from '../SortyBy.svelte'
  import {
    direction,
    sortBy,
    onlyWithPicture,
    filterText,
    visibleOnly,
  } from '../../stores/mountainFilters'
  import { getOlContext } from '../../ol/Map.svelte'
  import onMountTick from '../../utils/onMountTick'
  import { fromLonLat } from 'ol/proj'
  import { extent } from '../../stores/map'
  import { containsCoordinate } from 'ol/extent'
  import { all } from 'ol/events/condition'
  import RouteCard from './RouteCard.svelte'

  let hasGrade: number

  const viewMountain = (mountain: Mountain) => {
    fragment.update((value) => ({
      ...value,
      position: {
        ...value.position,
        lat: mountain.latlng[0],
        lng: mountain.latlng[1],
        zoom: 14,
      },
      page: `mountains/${encodeURIComponent(mountain.link)}`,
    }))
  }

  $: routes = Object.values($mountains).flatMap((m) => allRoutes(m)) as Route[]
  $: filteredRoutes = routes
    .filter((m) => m.name.toLowerCase().includes($filterText.toLowerCase()))
    .filter((p) => !$onlyWithPicture || p.image)
    // .filter(
    //   (p) =>
    //     !$visibleOnly ||
    //     (p.latlng &&
    //       containsCoordinate($extent, fromLonLat([p.latlng[1], p.latlng[0]])))
    // )
    .sort((a, b) => a.name.localeCompare(b.name))

  let sorted: Route[] = []
</script>

<div class="flex flex-col page w-full">
  <h1 class="font-bold">Routes</h1>
  <input
    class="w-full border-black border-solid border p-2 rounded"
    type="text"
    bind:value={$filterText} />
  <div class="flex flex-row justify-between w-full">
    <label>
      Only with picture
      <input type="checkbox" bind:checked={$onlyWithPicture} />
    </label>
    <label>
      Visible on map
      <input type="checkbox" bind:checked={$visibleOnly} />
    </label>
  </div>
  <SortyBy
    options={[
      'name',
      { name: 'length', getter: (m) => parseInt(m.altitude) },
      { name: 'pitches', getter: (m) => allRoutes(m).length },
      { name: 'grade', getter: (m) => m.grade },
    ]}
    unsorted={routes}
    bind:direction={$direction}
    bind:selectedIndex={$sortBy}
    bind:sorted />
  <div class="my-2">
    (showing {filteredRoutes.length} of {routes.length} routes)
  </div>
  <div class="flex flex-col gap-2 -mx-4 -mb-4 min-h-0 flex-1">
    <VirtualList items={sorted} let:item>
      <div
        class="cursor-pointer px-4 py-1"
        on:keyup={(e) => {
          if (e.key !== 'Enter') return
          // viewMountain(item)
        }}>
        <RouteCard route={item} />
      </div>
    </VirtualList>
  </div>
</div>

<style>
  .page {
    height: calc(100% - 2.875rem);
  }
</style>
