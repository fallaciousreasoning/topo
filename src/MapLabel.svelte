<script lang="ts">
  import { fromLonLat } from "ol/proj";
  import { getOlContext } from "./ol/Map.svelte";

  import Popup from "./ol/Popup.svelte";
  import fragment, { setLabel } from "./stores/fragment";

  const { map } = getOlContext();

  $: labelInfo = $fragment.label;
  $: position = fromLonLat([labelInfo.lng, labelInfo.lat]);

  $: {
    if (labelInfo.text && position[0] && position[1]) {
      map.getView().animate({ center: position });
    }
  }
</script>

{#if !!labelInfo.text}
  <Popup
    {position}
    on:close={() => setLabel({
        lat: null,
        lng: null,
        text: null,
      })}>
    <p>{labelInfo.text}</p>
  </Popup>
{/if}
