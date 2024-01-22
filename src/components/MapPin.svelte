<script lang="ts">
  import { toLonLat } from 'ol/proj'
  import { getOlContext } from '../ol/Map.svelte'
  import fragment from '../stores/fragment'
  import { findPlace } from '../search/geocode'
  import round from '../utils/round'

  const { map } = getOlContext()

  map.on('click', async (e) => {
    const [lng, lat] = toLonLat(e.coordinate)
    const closestPoint = await findPlace(lat, lng)
    $fragment.label = {
      lat: closestPoint?.lat ?? lat,
      lng: closestPoint?.lon ?? lng,
      text: closestPoint?.name ?? `Lat/Lon: ${round(lat, 5)},${round(lng, 5)}`,
    }
  })
</script>
