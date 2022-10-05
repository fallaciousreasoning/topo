<script lang="ts">
  import { getContext, onMount } from 'svelte'
  import Feature from 'ol/Feature'
  import { Style } from 'ol/style'
  import type { Coordinate } from 'ol/coordinate'
  import Point from 'ol/geom/Point'

  export let style: Style
  export let position: Coordinate
  const { addFeature, removeFeature } = getContext('vector-layer')

  const feature = new Feature({
    geometry: new Point(position),
  })

  $: feature.setGeometry(new Point(position))
  $: feature.setStyle(style)

  onMount(() => {
    addFeature(feature)
    return () => removeFeature(feature)
  })
</script>
