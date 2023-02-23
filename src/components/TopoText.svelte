<script lang="ts">
  import fragment from '../stores/fragment'

  export let text: string

  import { convertNZMGReferenceToLatLng } from '../utils/mapReference'
  const regex = /([a-zA-z]\d{0,2}\s?\d{2,3}\s?\d{2,3})/gim
  const parts = text
    .split(regex)
    .map((p) => ({ latlng: convertNZMGReferenceToLatLng(p), text: p }))
</script>

{#each parts as part}
  {#if part.latlng}
    <a
      on:click={(e) => {
        e.preventDefault()
        fragment.update((v) => ({
          ...v,
          label: {
            lat: part.latlng[0],
            lng: part.latlng[1],
            text: part.text
          }
        }))
      }}>{part.text}</a>
  {:else}
    {part.text}
  {/if}
{/each}
