import * as React from 'react'
import Control from './Control'
import { useRouteUpdater } from '../routing/router'

export default function SearchControl() {
    const updateRoute = useRouteUpdater()

    return <Control position='top-left'>
        <button type='button' onClick={() => updateRoute({ page: 'search' })}>
            🔎
        </button>
    </Control>
}
