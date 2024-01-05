<script lang="ts">
    import { toLonLat } from 'ol/proj'
  import { getOlContext } from '../ol/Map.svelte'
    import fragment from '../stores/fragment'

  const { map } = getOlContext()

  map.on('click', e => {
    const [lng, lat] = toLonLat(e.coordinate)
    $fragment.label = {
        lat,
        lng,
        text: `Lat/Lng: ${lat},${lng}`
    }
  })
</script>
