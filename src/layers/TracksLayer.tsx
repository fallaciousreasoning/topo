import * as React from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '../caches/indexeddb'
import { useParams } from '../routing/router'
import { buildFullCoordinates } from '../tracks/trackUtils'
import Source from '../map/Source'
import Layer from '../map/Layer'

export default function TracksLayer() {
  const { editingFeature } = useParams()
  const tracks = useLiveQuery(() => db.getTracks(), []) ?? []

  const geojson = React.useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: tracks
      .filter(t => t.id !== editingFeature && t.coordinates.length >= 2)
      .map(t => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: buildFullCoordinates(t),
        },
        properties: { id: t.id, name: t.name ?? `Track ${t.id}` },
      })),
  }), [tracks, editingFeature])

  return (
    <>
      <Source id="user-tracks" spec={{ type: 'geojson', data: geojson }} />
      <Layer
        layer={{
          id: 'user-tracks-line',
          type: 'line',
          source: 'user-tracks',
          paint: {
            'line-color': 'rgb(0, 0, 255)',
            'line-width': 3,
            'line-opacity': 0.6,
          },
        }}
      />
    </>
  )
}
