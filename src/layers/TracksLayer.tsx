import * as React from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { GeoJSONSource } from 'maplibre-gl'
import db from '../caches/indexeddb'
import { useParams, useRouteUpdater } from '../routing/router'
import { buildFullCoordinates } from '../tracks/trackUtils'
import { useMap } from '../map/Map'
import { useLayerHandler } from '../hooks/useLayerClickHandler'
import Source from '../map/Source'
import Layer from '../map/Layer'
import { OverlayDefinition } from './config'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

function TracksLayer() {
  const { map } = useMap()
  const { editingFeature } = useParams()
  const updateRoute = useRouteUpdater()
  const tracks = useLiveQuery(() => db.getTracks(), []) ?? []

  const geojson = React.useMemo(() => {
    if (editingFeature) return EMPTY
    const features = tracks
      .filter(t => t.coordinates.length >= 2)
      .map(t => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: buildFullCoordinates(t),
        },
        properties: { id: t.id, name: t.name ?? `Track ${t.id}`, color: t.color ?? '#3b82f6' },
      }))
    return { type: 'FeatureCollection' as const, features }
  }, [tracks, editingFeature])

  React.useEffect(() => {
    const source = map.getSource('user-tracks') as GeoJSONSource | undefined
    source?.setData(geojson)
  }, [map, geojson])

  useLayerHandler('click', 'user-tracks-line', React.useCallback(e => {
    const id = e.features?.[0]?.properties?.id
    if (id != null) updateRoute({ page: `track/${id}` })
  }, [updateRoute]))

  return (
    <Source id="user-tracks" spec={{ type: 'geojson', data: EMPTY }}>
      <Layer
        layer={{
          id: 'user-tracks-line',
          type: 'line',
          source: 'user-tracks',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 3,
            'line-opacity': 0.6,
          },
        }}
      />
    </Source>
  )
}

export default {
  id: 'user-tracks',
  name: 'Tracks',
  description: 'Your saved tracks',
  type: 'overlay',
  cacheable: false,
  source: TracksLayer,
} as OverlayDefinition
