<script lang="ts">
  import VectorSource from 'ol/source/Vector'
  import Feature from 'ol/Feature'
  import VectorLayer from '../ol/VectorLayer.svelte'
  import { Cluster } from 'ol/source'
  import type { StyleLike } from 'ol/style/Style'

  export let options: {
    id: string
    clusterDistance: number
    getFeatures: () => Promise<Feature[]>
    style: StyleLike
    onFeatureClicked?: (feature: Feature) => void
    title: string
  }

  const onFeatureClicked = options.onFeatureClicked
    ? (e) => options.onFeatureClicked(e.detail.feature)
    : undefined

  const clustersPromise = options.getFeatures().then(
    (features) =>
      new Cluster({
        distance: options.clusterDistance,
        source: new VectorSource({
          features,
        }),
      })
  )
</script>

{#await clustersPromise then clusters}
  <VectorLayer
    id={options.id}
    source={clusters}
    style={options.style}
    title={options.title}
    on:featureClick={onFeatureClicked} />
{/await}
