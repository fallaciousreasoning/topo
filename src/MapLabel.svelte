<script lang="ts">
  import { fromLonLat } from "ol/proj";
  import { getOlContext } from "./ol/Map.svelte";

  import Popup from "./ol/Popup.svelte";
  import fragment from "./stores/fragment";

  const { getMap } = getOlContext();

  $: labelInfo = $fragment.label;
  $: position = fromLonLat([labelInfo.lng, labelInfo.lat]);

  $: {
    const map = getMap();
    if (map && labelInfo.text) {
      map.getView().animate({ center: position });
    }
  }
</script>

{#if !!labelInfo.text}
  <Popup {position}>
    <p>{labelInfo.text}</p>
  </Popup>
{/if}
