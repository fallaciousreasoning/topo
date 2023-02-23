<script lang="ts">
  import fragment from '../../stores/fragment'
  import mountains from '../../stores/mountains'

  let search: string = ''
  $: filteredMountains = Object.values($mountains)
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
</script>

<h1 class="font-bold">Mountains</h1>
<input class="w-full border-black border-solid border p-2 rounded" type="text" bind:value={search} />

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
