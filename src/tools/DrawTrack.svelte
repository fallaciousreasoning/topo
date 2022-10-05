<script lang="ts">
  import VectorLayer from 'ol/layer/Vector'
  import VectorSource from 'ol/source/Vector'
  import { Draw, Modify } from 'ol/interaction'
  import GeometryType from 'ol/geom/GeometryType'
  import onMountTick from '../utils/onMountTick'
  import Map, { getOlContext } from '../ol/Map.svelte'
  import { Style, Stroke, Fill, Text } from 'ol/style'
  import type { Coordinate } from 'ol/coordinate'
  import { Point, LineString } from 'ol/geom'
  import type { StyleLike } from 'ol/style/Style'
  import CircleStyle from 'ol/style/Circle'
  import { getLength } from 'ol/sphere'
  import Popup from '../ol/Popup.svelte'
  import { friendlyDistance } from '../utils/friendlyUnits'
  import { getPathHeight } from '../search/height'
  import Chart from 'svelte-frappe-charts'
  import round from '../utils/round'
  import { db, insertItem, updateItem } from '../db'
  import { liveQuery } from 'dexie'
  import { lineStringToLatLngs, trackToGeometry } from '../db/track'
  import type {Track} from '../db/track'
  import { toLonLat } from 'ol/proj'
  import type { LatLng } from '../db/latlng'
    import Feature from 'ol/Feature'

  export let trackId: string = '078f0775-e2cc-4b4e-a1e6-154117dbb11e'
  if (!trackId) {
    const toInsert: Track = { id: undefined, points: [], draft: true }
    insertItem('tracks', toInsert)
    trackId = toInsert.id
  }

  const { map } = getOlContext()
  let track = liveQuery(() => {
    return db.tracks.where({ id: trackId }).first()
  })

  const styleFunction: StyleLike = (feature) => {
    const stroke = 'white'
    const fill = '#0099ff'
    const width = 5

    const styles = [
      new Style({
        stroke: new Stroke({
          color: fill,
          width: width,
        }),
      }),
    ]

    const geometry = feature.getGeometry()
    const coordinates = geometry['getCoordinates']()
    for (const coordinate of coordinates) {
      styles.push(
        new Style({
          geometry: new Point(coordinate),
          image: new CircleStyle({
            radius: width + 2,
            fill: new Fill({
              color: fill,
            }),
            stroke: new Stroke({
              color: stroke,
            }),
          }),
        })
      )
    }

    return styles
  }

  const source = new VectorSource()

  const layer = new VectorLayer({
    source,
    style: styleFunction,
    updateWhileInteracting: true,
    updateWhileAnimating: true,
  })

  let interaction: Draw | Modify = new Draw({
    source: source,
    type: GeometryType.LINE_STRING,

    style: styleFunction,
  })

  track.subscribe(t => {
    source.clear();

    if (!t) return;

    source.addFeature(new Feature(trackToGeometry(t)));
    
    map.removeInteraction(interaction)
    interaction = new Modify({
      source
    })
    map.addInteraction(interaction);
  });

  let popupPosition: Coordinate
  let popupMessage: string
  let distance: number
  let heights: { height: number; percent: number }[]

  interaction.on('drawstart', ({ feature }) => {
    const geometry = feature.getGeometry() as LineString;
    popupMessage = `Click last point to finish line.`

    geometry.on('change', () => {
      popupPosition = geometry['getLastCoordinate']()
      distance = getLength(geometry)

      updateItem('tracks', trackId, { points: lineStringToLatLngs(geometry) })
    })
  })

  // When the draw finished, start modifying the layerer.
  interaction.on('drawend', async ({ feature }) => {
    map.removeInteraction(interaction)
    popupMessage = null

    const geometry = feature.getGeometry() as LineString
    heights = await getPathHeight(geometry)

    interaction = new Modify({
      source,
    })
    map.addInteraction(interaction)
  })

  onMountTick(() => {
    map.addInteraction(interaction)
    map.addLayer(layer)
    return () => {
      map.removeInteraction(interaction)
      map.removeLayer(layer)
    }
  })
</script>

<Popup position={popupPosition} closable={false}>
  <div class="popup-content">
    {#if popupMessage}{popupMessage}{/if}
    <div class="distance">
      <b>Distance:</b>
      <span>{friendlyDistance(distance)}</span>
    </div>
  </div>
</Popup>

{#if heights}
  <div class="chart">
    <Chart
      type="line"
      axisOptions={{ xIsSeries: true, xAxisMode: 'tick' }}
      lineOptions={{ regionFill: 1, hideDots: true }}
      height={200}
      tooltipOptions={{
        formatTooltipX: (d) => `→ ${friendlyDistance(d)}`,
        formatTooltipY: (d) => `↑ ${d}m`,
      }}
      data={{
        labels: heights.map((h) => round(h.percent * distance, 0)),
        datasets: [{ values: heights.map((h) => h.height) }],
      }}
    />
  </div>
{/if}

<style>
  .popup-content {
    white-space: nowrap;
    pointer-events: none;
    cursor: none;
    user-select: none;
    -moz-user-select: none;
  }

  .chart {
    position: absolute;
    background: white;
    left: 0;
    bottom: 0;
    width: 100vw;
    height: 200px;
    z-index: 1000;
  }
</style>
