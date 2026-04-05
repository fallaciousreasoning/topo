import * as React from 'react'
import Control from './Control'
import { useParams, useRouteUpdater } from '../routing/router'
import db from '../caches/indexeddb'
import { randomColor } from '../utils/randomColor'

export default function MeasureControl() {
    const updateRoute = useRouteUpdater()
    const { editingFeature } = useParams()

    if (editingFeature) return null

    const handleClick = async () => {
        const track = await db.updateTrack({ coordinates: [], color: randomColor() })
        updateRoute({ editingFeature: track.id! })
    }

    return <Control position='top-left'>
        <button type='button' title='Measure' onClick={handleClick}>
            📏
        </button>
    </Control>
}
