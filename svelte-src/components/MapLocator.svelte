<script lang="ts">
  import Geolocation from 'ol/Geolocation'
  import type { Coordinate } from 'ol/coordinate'
  import Icon from 'ol/style/Icon'
  import Style from 'ol/style/Style'
  import Feature from '../ol/Feature.svelte'
  import { getOlContext } from '../ol/Map.svelte'
  import VectorLayer from '../ol/VectorLayer.svelte'
  import MapControl from './MapControl.svelte'

  const { map } = getOlContext()

  let tracking = false
  let position: Coordinate

  let geolocation = new Geolocation({
    projection: map.getView().getProjection(),
    trackingOptions: {
      enableHighAccuracy: true,
    },
  })
  geolocation.on('change', (e) => {
    const locatedPos = geolocation.getPosition()
    if (!locatedPos) return
    position = locatedPos
  })

  $: {
    if (tracking) {
      geolocation.once('change', () =>
        map.getView().setCenter(geolocation.getPosition()),
      )
    }

    geolocation.setTracking(tracking)
  }
</script>

<MapControl>
  <button
    on:click={() => (tracking = !tracking)}
    class={`map-button ${
      tracking && 'hover:bg-primary-hover hover:text-background'
    }`}
  >
    ⬊
  </button>
</MapControl>

<VectorLayer>
  {#if tracking && position}
    <Feature
      {position}
      style={new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          opacity: 0.9,
          size: [600, 600],
          scale: 0.08,
          color: '#578dfF',
          src: '/icons/location-indicator.svg',
        }),
      })}
    />
  {/if}
</VectorLayer>
