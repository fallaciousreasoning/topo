<script lang="ts">
  import Feature from 'ol/Feature'
  import { type Coordinate } from 'ol/coordinate'
  import { LineString, Point } from 'ol/geom'
  import { getDistance } from 'ol/sphere'
  import { Stroke, Style, Text } from 'ol/style'
  import { getContext } from 'svelte'
  import { getOlContext } from './Map.svelte'
  import type { VectorLayerContext } from './VectorLayer.svelte'
  export let start: Coordinate
  export let style = new Style({
    text: new Text({
      text: 'Foo',
      stroke: new Stroke({ color: 'black' }),
      offsetY: -4,
      textBaseline: 'bottom',
      placement: 'line',
    }),
    stroke: new Stroke({
      color: 'black',
      width: 4,
    }),
  })

  const { addFeature, removeFeature } =
    getContext<VectorLayerContext>('vector-layer')
  const { map } = getOlContext()

  const geometry = new LineString([start, map.getView().getCenter()!])
  const feature = new Feature<LineString>({
    geometry,
  })

  $: feature.setStyle(function (feature: Feature<LineString>) {
    const coordinates = feature.getGeometry()?.getCoordinates()!
    const end = coordinates.at(-1)!

    const distance = Math.round(getDistance(coordinates[0]!, end))

    return [
      new Style({
        geometry: new Point(end),
        text: new Text({
          text: `${distance}`,
          scale: 2,
          stroke: new Stroke({ color: 'black' }),
          
          placement: 'line',
          offsetY: -10,
        }),
      }),
      style,
    ]
  })

  addFeature(feature)

  map.getView().on('change:center', (e) => {
    const center = map.getView().getCenter()!
    geometry.setCoordinates([start, center])
  })
</script>
