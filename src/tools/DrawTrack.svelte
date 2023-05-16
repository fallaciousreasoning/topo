<script lang="ts">
  import VectorLayer from 'ol/layer/Vector'
  import VectorSource from 'ol/source/Vector'
  import { Draw, Modify } from 'ol/interaction'
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
  import { getPathElevations } from '../search/height'
  import { db, updateItem } from '../db'
  import { liveQuery } from 'dexie'
  import { lineStringToLatLngs, trackToGeometry } from '../db/track'
  import type { Track } from '../db/track'
  import Feature from 'ol/Feature'

  export let trackId: string

  const { map } = getOlContext()

  const trackListener = (t: Track) => {
    source.clear()

    const geometry = trackToGeometry(t)
    const feature = new Feature(geometry)
    source.addFeature(feature)

    map.removeInteraction(interaction)

    if (t.points.length >= 2) {
      interaction = new Modify({
        source,
      })
    } else {
      interaction = new Draw({
        source,
        type: 'LineString',
        style: styleFunction,
      })
      if (t.points.length) interaction.extend(feature)
    }
    map.addInteraction(interaction)
  }

  $: track = liveQuery(() => {
    return db.tracks.where({ id: trackId }).first()
  })

  $: track.subscribe(trackListener)

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

  let interaction: Draw | Modify

  let popupPosition: Coordinate
  let popupMessage: string
  let distance: number

  $: {
    interaction?.on(
      interaction instanceof Modify ? 'modifystart' : 'drawstart' as any,
      (e) => {
        const feature = e['feature'] ?? source.getFeatures()[0]

        const geometry = feature.getGeometry() as LineString
        popupMessage = `Click last point to finish line.`

        geometry.on('change', () => {
          popupPosition = geometry['getLastCoordinate']()
          distance = getLength(geometry)
        })
      }
    )

    // When the draw finished, start modifying the layerer.
    interaction?.on(
      interaction instanceof Modify ? 'modifyend' : 'drawend' as any,
      async (e) => {
        const feature = e['feature'] ?? source.getFeatures()[0]
        map.removeInteraction(interaction)
        popupMessage = null

        const geometry = feature.getGeometry() as LineString
        updateItem('tracks', trackId, {
          points: lineStringToLatLngs(geometry),
          distance: getLength(geometry)
        })

        const elevations = await getPathElevations(geometry)
        await updateItem('tracks', trackId, { elevations })

        interaction = new Modify({
          source,
        })
        map.addInteraction(interaction)
      }
    )
  }

  onMountTick(() => {
    map.addLayer(layer)
    return () => {
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

<style>
  .popup-content {
    white-space: nowrap;
    pointer-events: none;
    cursor: none;
    user-select: none;
    -moz-user-select: none;
  }
</style>
