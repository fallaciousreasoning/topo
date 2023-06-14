<script lang="ts">
  import fragment from '../../stores/fragment'
  import mountains, { Mountain, Route } from '../../stores/mountains'
  import { allRoutes } from '../../utils/routes'
  import SortyBy from '../SortyBy.svelte'
  import {
    direction,
    sortBy,
    onlyWithPicture,
    filterText,
    visibleOnly,
    rock,
    alpine,
    ice,
    mixed,
    scrollPos,
    minStars,
    maxStars,
  } from '../../stores/mountainFilters'
  import Card from '../Card.svelte'
  import { fromLonLat } from 'ol/proj'
  import { extent } from '../../stores/map'
  import { containsCoordinate } from 'ol/extent'
  import Grade from './Grade.svelte'
  import { parseGrade } from '../../utils/grade'
  import VirtualList from '../VirtualList.svelte'
    import { repeatString } from '../../utils/array'

  const viewMountain = (mountain: Mountain, route: Route) => {
    fragment.update((value) => ({
      ...value,
      position: {
        ...value.position,
        lat: mountain.latlng[0],
        lng: mountain.latlng[1],
        zoom: 14,
      },
      page: `mountains/${encodeURIComponent(
        mountain.link
      )}/${encodeURIComponent(route.name)}`,
    }))
  }

  $: routes = Object.values($mountains).flatMap((m) =>
    allRoutes(m).map((r) => [m, r])
  ) as [Mountain, Route][]
  $: filteredRoutes = routes
    .filter(
      ([m, r]) =>
        r.name.toLowerCase().includes($filterText.toLowerCase()) ||
        m.name.toLowerCase().includes($filterText.toLowerCase())
    )
    .filter(([m, r]) => !$onlyWithPicture || r.image)
    .filter(
      ([m, r]) =>
        !$visibleOnly ||
        (m.latlng &&
          containsCoordinate($extent, fromLonLat([m.latlng[1], m.latlng[0]])))
    )
    // Filter grade
    .filter(([, r]) => {
      // If we aren't filtering by anything, include everything.
      if (!$alpine && !$rock && !$ice && !$mixed) return true

      const grade = parseGrade(r.grade)
      return (
        (grade.alpine && $alpine) ||
        (grade.ewbank && $rock) ||
        (grade.ice && $ice) ||
        (grade.mixed && $mixed)
      )
    })
    // Filter stars
    .filter(([,r]) => {
      if ($minStars !== 'any' && r.quality < $minStars) return false
      if ($maxStars !== 'any' && r.quality > $maxStars) return false
      return true
    })

  let sorted: Route[] = []
</script>

<div class="flex flex-col page w-full">
  <details open>
    <summary class="font-bold">Routes</summary>
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
    <div class="flex flex-row justify-between w-full">
      <label>
        Alpine
        <input type="checkbox" bind:checked={$alpine} />
      </label>
      <label>
        Rock
        <input type="checkbox" bind:checked={$rock} />
      </label>
      <label>
        Ice
        <input type="checkbox" bind:checked={$ice} />
      </label>
      <label>
        Mixed
        <input type="checkbox" bind:checked={$mixed} />
      </label>
    </div>
    <details>
      <summary> Stars </summary>
      <div class="flex flex-col">
        <label>
          Min:
          <select bind:value={$minStars}>
            <option value='any'>Any</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>
        <label>
          Max:
          <select bind:value={$maxStars}>
            <option value='any'>Any</option>
            <option>0</option>
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>
        </label>
      </div>
    </details>
    <SortyBy
      options={[
        { name: 'name', getter: ([m, r]) => r.name },
        {
          name: 'length',
          getter: ([m, r]) => {
            const length = parseInt(r.length)
            return isNaN(length) ? 0 : length
          },
        },
        { name: 'pitches', getter: ([m, r]) => r.pitches.length },
        { name: 'grade', getter: ([m, r]) => r.grade },
      ]}
      unsorted={filteredRoutes}
      bind:direction={$direction}
      bind:selectedIndex={$sortBy}
      bind:sorted />
  </details>
  <div class="my-2">
    (showing {filteredRoutes.length} of {routes.length} routes)
  </div>
  <div class="flex flex-col gap-2 -mx-4 -mb-4 min-h-0 flex-1">
    <VirtualList items={sorted} let:item bind:scrollPos={$scrollPos}>
      <div
        class="cursor-pointer px-4 py-1"
        on:keyup={(e) => {
          if (e.key !== 'Enter') return
          viewMountain(item[0], item[1])
        }}
        on:click={() => viewMountain(item[0], item[1])}>
        <Card imageUrl={item[1].image}>
          <div slot="title">
            <Grade route={item[1]} />
            {item[1].name}
            {#if item[1].length}
              <span class="font-normal text-gray-700">
                ({item[1].length})
              </span>
            {/if}
            {repeatString('★', item[1].quality)}
          </div>
          <div slot="pretitle">
            {item[0].name}
          </div>
          <div>
            {item[1].description}
            <div class="italic text-gray-600">{item[1].ascent}</div>
          </div>
        </Card>
      </div>
    </VirtualList>
  </div>
</div>

<style>
  .page {
    height: calc(100% - 2.875rem);
  }
</style>
