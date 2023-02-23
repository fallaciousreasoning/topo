<script lang="ts">
  import fragment from '../../stores/fragment'
  import mountains from '../../stores/mountains'

  let search: string = ''
  let hasGrade: number;
  $: filteredMountains = Object.values($mountains).filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  ).filter(p => !hasGrade || p.routes.some(r => r.grade?.includes(hasGrade))).sort((a, b) => a.name.localeCompare(b.name))
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
</div>
{#each filteredMountains as mountain}
  <div>
    <a
      on:click={(e) => {
        e.preventDefault()
        fragment.update((value) => ({
          ...value,
          page: `mountains/${encodeURIComponent(mountain.link)}`,
        }))
      }}
      href={`#page=mountains/${encodeURIComponent(mountain.link)}`}
      >{mountain.name} ({mountain.altitude})</a>
  </div>
{/each}
