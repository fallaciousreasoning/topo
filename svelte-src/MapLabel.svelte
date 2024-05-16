<script lang="ts">
  import { fromLonLat } from "ol/proj";
import Marker from "./Marker.svelte";
  import { getOlContext } from "./ol/Map.svelte";

  import Popup from "./ol/Popup.svelte";
  import fragment from "./stores/fragment";
  import { shallowEqual } from "./utils/equal";

  const { map } = getOlContext();

  let lastLabel = $fragment.label;
  $: labelInfo = $fragment.label;
  $: position = fromLonLat([labelInfo.lng, labelInfo.lat]);

  $: {
    if (!shallowEqual(lastLabel, labelInfo)) {
      lastLabel = labelInfo;
      if (labelInfo.text && position[0] && position[1]) {
        map.getView().animate({ center: position });
      }
    }
  }
</script>

{#if !!labelInfo.text}
  <Popup
    width='w-48'
    {position}
    on:close={() =>
      ($fragment.label = {
        lat: null,
        lng: null,
        text: null,
      })}
  >
    <p>{labelInfo.text}</p>
  </Popup>
{:else}
  <Marker {position}></Marker>
{/if}
