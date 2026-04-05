import * as React from 'react'
import Control from './Control'
import { useRouteUpdater } from '../routing/router'
import db from '../caches/indexeddb'

export default function MeasureControl() {
    const updateRoute = useRouteUpdater()

    const handleClick = async () => {
        const track = await db.updateTrack({ coordinates: [] })
        updateRoute({ editingFeature: track.id! })
    }

    return <Control position='top-left'>
        <button type='button' title='Measure' onClick={handleClick}>
            📏
        </button>
    </Control>
}
