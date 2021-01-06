<script lang="ts">
  import type { Coordinate } from "ol/coordinate";
  import Geolocation from "ol/Geolocation";
  import Icon from "ol/style/Icon";
  import Style from "ol/style/Style";
import MapButton from "./components/MapButton.svelte";
  import Control from "./ol/Control.svelte";
  import Feature from "./ol/Feature.svelte";
  import { getOlContext } from "./ol/Map.svelte";
  import VectorLayer from "./ol/VectorLayer.svelte";
  import onMountTick from "./utils/onMountTick";

  const { map } = getOlContext();

  let tracking = false;
  let position: Coordinate;

  let geolocation = new Geolocation({ projection: map.getView().getProjection() });
  geolocation.on("change", (e) => {
    position = geolocation.getPosition();
  });

  $: {
    if (tracking) {
      geolocation.once("change", () =>
        map.getView().setCenter(geolocation.getPosition())
      );
    }

    geolocation.setTracking(tracking);
  }
</script>

<MapButton on:click={() => tracking = !tracking}>
  <span class={`${tracking ? 'text-primary' : 'text-foreground'}`}>
    ⬊
  </span>
</MapButton>

<VectorLayer>
  {#if tracking && position}
    <Feature
      {position}
      style={new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          opacity: 0.9,
          imgSize: [600, 600],
          scale: 0.08,
          color: '#578dfF',
          src: '/icons/location-indicator.svg',
        }),
      })} />
  {/if}
</VectorLayer>
