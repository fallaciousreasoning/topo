<script lang="ts">
  import { fromLonLat } from "ol/proj";

  import Popup from "./ol/Popup.svelte";
  import fragment from './stores/fragment';

  $: labelInfo = $fragment.label;
  $: position = fromLonLat([labelInfo.lng, labelInfo.lat])
</script>

{#if !!labelInfo.text}
  <Popup {position} autoPan>
    <p>{labelInfo.text}</p>
  </Popup>
{/if}
