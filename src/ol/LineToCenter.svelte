<script lang="ts">
  import Feature from 'ol/Feature'
  import { type Coordinate } from 'ol/coordinate'
  import { LineString, Point } from 'ol/geom'
  import { getDistance } from 'ol/sphere'
  import { Fill, Icon, Image, Stroke, Style, Text } from 'ol/style'
  import { getContext } from 'svelte'
  import { getOlContext } from './Map.svelte'
  import type { VectorLayerContext } from './VectorLayer.svelte'
    import { toLonLat } from 'ol/proj'
  export let start: Coordinate
  export let style = new Style({
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
    const last = toLonLat(coordinates.at(-1)!)
    const first = toLonLat(coordinates.at(0)!)
    const distance = Math.round(getDistance(first, last))

    return [
      new Style({
        geometry: new Point(coordinates.at(-1)!),
        text: new Text({
          justify: 'center',
          backgroundFill: new Fill({ color: 'white'}),
          backgroundStroke: new Stroke({ color: 'gray',  }),
          textAlign: 'center',
          padding: [8, 4, 8, 8],
          text: `${distance}m`,
          font: '20px sans-serif',
          scale: 1,
          stroke: new Stroke({ color: 'black' }),
          
          placement: 'line',
          offsetY: -48,
        }),
        image: new Icon({
          anchor: [0.5, 0.5],
          opacity: 0.9,
          scale: 0.08,
          color: '#000',
          src: '/icons/location-indicator.svg'
        })
      }),
      style,
    ]
  } as any)

  addFeature(feature)

  map.getView().on('change:center', (e) => {
    const center = map.getView().getCenter()!
    geometry.setCoordinates([start, center])
  })
</script>
