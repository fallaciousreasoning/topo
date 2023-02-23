<script lang="ts">
    import fragment from '../stores/fragment'

  export let text: string

  import {
    convertNZMGReferenceToLatLng,
  } from '../utils/mapReference'
  const regex = /([a-zA-z]\d{0,2}\s?\d{2,3}\s?\d{2,3})/gmi
  const parts = text.split(regex)
    .map(p => convertNZMGReferenceToLatLng(p) || p)
</script>

{#each parts as part}
  {#if Array.isArray(part) }
    <a href="#lat=${part[0]}&lng=${part[1]}" on:click={(e) => {
        e.preventDefault()
        fragment.update(v => ({
            ...v, 
        position: {
...v.position,
lat: part[1],
lng: part[0]
        }
        }))
    }}>{part}</a>
  {:else}
    {part}
  {/if}
{/each}
