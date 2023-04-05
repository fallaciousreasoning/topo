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
  import Card from '../Card.svelte'
  import { fromLonLat } from 'ol/proj'
  import { extent } from '../../stores/map'
  import { containsCoordinate } from 'ol/extent'

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

  $: routes = Object.values($mountains).flatMap((m) =>
    allRoutes(m).map((r) => [m, r])
  ) as [Mountain, Route][]
  $: filteredRoutes = routes
    .filter(([m, r]) =>
      r.name.toLowerCase().includes($filterText.toLowerCase())
    )
    .filter(([m, r]) => !$onlyWithPicture || r.image)
    .filter(
      ([m, r]) =>
        !$visibleOnly ||
        (m.latlng &&
          containsCoordinate($extent, fromLonLat([m.latlng[1], m.latlng[0]])))
    )

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
      { name: 'name', getter: ([m, r]) => r.name },
      { name: 'length', getter: ([m, r]) => parseInt(r.length) },
      { name: 'pitches', getter: ([m, r]) => r.pitches.length },
      { name: 'grade', getter: ([m, r]) => r.grade },
    ]}
    unsorted={filteredRoutes}
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
          viewMountain(item[0])
        }}
        on:click={() => viewMountain(item[0])}>
        <Card imageUrl={item[1].image}>
          <div slot="title">
            <span class="p-1 bg-orange-400 rounded text-white"
              >{item[1].grade}</span>
            {item[1].name}
          </div>
          <div slot="pretitle">
            {item[0].name}
          </div>
          <div>
            {item[1].description}
          </div>
        </Card>
      </div>
    </VirtualList>
  </div>
</div>

<style>
  .grade {
    background: orange;
    color: white;
  }
  .page {
    height: calc(100% - 2.875rem);
  }
</style>
