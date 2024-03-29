<script lang="ts">
  import fragment from '../../stores/fragment'
  import mountains, { type Mountain } from '../../stores/mountains'
  import { allRoutes, getPicture } from '../../utils/routes'
  import MountainCard from './MountainCard.svelte'
  import SortyBy from '../SortyBy.svelte'
  import {
    direction,
    sortBy,
    onlyWithPicture,
    filterText,
    visibleOnly,
    scrollPos,
  } from '../../stores/mountainFilters'
  import { fromLonLat } from 'ol/proj'
  import { extent } from '../../stores/map'
  import { containsCoordinate } from 'ol/extent'
  import VirtualList from '../VirtualList.svelte'

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

  $: totalMountains = Object.keys($mountains).length
  $: filteredMountains = Object.values($mountains)
    .filter((m) => m.name.toLowerCase().includes($filterText.toLowerCase()))
    .filter((p) => !$onlyWithPicture || getPicture(p))
    .filter(
      (p) => !hasGrade || allRoutes(p).some((r) => r.grade?.includes(hasGrade))
    )
    .filter(
      (p) =>
        !$visibleOnly ||
        (p.latlng &&
          containsCoordinate($extent, fromLonLat([p.latlng[1], p.latlng[0]])))
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  let sorted: Mountain[] = []
</script>

<div class="flex flex-col page w-full">
  <input
    class="w-full border-black border-solid border p-2 rounded"
    type="text"
    bind:value={$filterText} />
  <div class="flex flex-row justify-between w-full">
    <label>
      Has Route at Grade
      <select class="w-full" bind:value={hasGrade}>
        <option value="">Any</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
    </label>
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
      { name: 'altitude', getter: (m) => parseInt(m.altitude) },
      { name: 'routes', getter: (m) => allRoutes(m).length },
      { name: 'areas', getter: (m) => m.places.length },
    ]}
    unsorted={filteredMountains}
    bind:direction={$direction}
    bind:selectedIndex={$sortBy}
    bind:sorted />
  <div class="my-2">
    (showing {filteredMountains.length} of {totalMountains} mountains)
  </div>
  <div class="flex flex-col gap-2 -mx-4 -mb-4 min-h-0 flex-1">
    <VirtualList items={sorted} let:item bind:scrollPos={$scrollPos}>
      <div
        class="cursor-pointer px-4 py-1"
        on:keyup={(e) => {
          if (e.key !== 'Enter') return
          viewMountain(item)
        }}
        on:click={(e) => viewMountain(item)}>
        <MountainCard mountain={item} />
      </div>
    </VirtualList>
  </div>
</div>

<style>
  .page {
    height: calc(100% - 2.875rem);
  }
</style>
