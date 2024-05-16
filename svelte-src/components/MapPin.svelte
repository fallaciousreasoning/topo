<script lang="ts">
  import { toLonLat } from 'ol/proj'
  import { getOlContext } from '../ol/Map.svelte'
  import fragment from '../stores/fragment'
  import { findPlace } from '../search/nearest'
  import round from '../utils/round'

  const { map } = getOlContext()

  const LONG_PRESS_THRESHOLD = 500;

  let mouseDownAt: number;
  map.getTargetElement().addEventListener('mousedown', e => {
    mouseDownAt = Date.now();
  });

  map.on('singleclick', async (e) => {
    const pressDuration = Date.now() - mouseDownAt
    if (pressDuration < LONG_PRESS_THRESHOLD) {
      return
    }

    const [lng, lat] = toLonLat(e.coordinate)
    const closestPoint = await findPlace(lat, lng)
    $fragment.label = {
      lat: closestPoint?.lat ?? lat,
      lng: closestPoint?.lon ?? lng,
      text: closestPoint?.name ?? `Lat/Lon: ${round(lat, 5)},${round(lng, 5)}`,
    }
  })
</script>
