<script lang="ts">
  import fragment from '../../stores/fragment'
  import mountains, { Mountain } from '../../stores/mountains'
  import { allRoutes } from '../../utils/routes'
  import MountainCard from './MountainCard.svelte'

  let search: string = ''
  let hasGrade: number
  let onlyWithPicture: boolean = false

  const hasPicture = (mountain: Mountain) => {
    return (
      mountain.image ||
      mountain.routes.some((r) => r.image) ||
      mountain.places.some((p) => hasPicture(p))
    )
  }

  $: filteredMountains = Object.values($mountains)
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !onlyWithPicture || hasPicture(p))
    .filter(
      (p) => !hasGrade || allRoutes(p).some((r) => r.grade?.includes(hasGrade))
    )
    .sort((a, b) => a.name.localeCompare(b.name))
</script>

<h1 class="font-bold">Mountains</h1>
<input
  class="w-full border-black border-solid border p-2 rounded"
  type="text"
  bind:value={search} />
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
    <input type="checkbox" bind:checked={onlyWithPicture} />
  </label>
</div>
<div class="my-2">({filteredMountains.length} mountains)</div>
<div class="flex flex-col gap-2">
  {#each filteredMountains as mountain}
    <div
      class="cursor-pointer"
      on:click={(e) => {
        e.preventDefault()
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
      }}>
      <MountainCard {mountain} />
    </div>
  {/each}
</div>
