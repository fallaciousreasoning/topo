<script lang="ts" context="module">
  export interface VectorLayerContext {
    addFeature: (feature: Feature) => void,
    removeFeature: (feature: Feature) => void,
  }
</script>
<script lang="ts">
  import { getOlContext } from './Map.svelte'
  import { createEventDispatcher, onMount, setContext } from 'svelte'
  import VectorLayer from 'ol/layer/Vector'
  import VectorSource from 'ol/source/Vector'
  import { Feature } from 'ol'
  import type { StyleLike } from 'ol/style/Style'
  import onMountTick from '../utils/onMountTick'
  import fragment from '../stores/fragment'

  export let id: string | undefined = undefined
  export let source = new VectorSource<Feature>({ features: [] })
  export let style: StyleLike | undefined = undefined
  export let title: string | undefined = undefined
  export let visible: boolean = true

  const dispatch = createEventDispatcher()
  const { addLayer, removeLayer, map } = getOlContext()

  const layer = new VectorLayer({
    source,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
    style,
    ['title' as any]: title,
    visible,
  })
  layer.set('id', id)

  $: {
    if (id) layer.setVisible($fragment.featureLayers.includes(id))
  }

  const featureClickHandler = (event) => {
    event.map.forEachFeatureAtPixel(event.pixel, (feature, clickedLayer) => {
      if (layer !== clickedLayer) return
      dispatch('featureClick', {
        feature: feature,
        layer: clickedLayer,
      })
    })
  }

  onMountTick(() => {
    map.on('click', featureClickHandler)

    addLayer(layer)
    return () => {
      map.un('click', featureClickHandler)
      removeLayer(layer)
    }
  })

  setContext<VectorLayerContext>('vector-layer', {
    addFeature: (feature: Feature) => source.addFeature(feature),
    removeFeature: (feature: Feature) => source.removeFeature(feature),
  })
</script>

<slot />
