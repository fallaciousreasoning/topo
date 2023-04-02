<script lang="ts">
  import fragment from '../../stores/fragment'
  import mountains, { Mountain } from '../../stores/mountains'
  import { allRoutes, getPicture } from '../../utils/routes'
  import MountainCard from './MountainCard.svelte'
  import VirtualList from '@sveltejs/svelte-virtual-list'
  import SortyBy from '../SortyBy.svelte'
  import { direction, sortBy, onlyWithPicture, filterText } from '../../stores/mountainFilters'

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
    .sort((a, b) => a.name.localeCompare(b.name))

  let sorted: Mountain[] = []
</script>

<div class="flex flex-col page w-full">
  <h1 class="font-bold">Mountains</h1>
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
    <VirtualList items={sorted} let:item>
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
