import * as React from 'react'
import Control from './Control'
import { useRouteUpdater } from '../routing/router'

export default function MenuControl() {
    const updateRoute = useRouteUpdater()

    return <Control position='top-left'>
        <button type='button' onClick={() => updateRoute({ page: 'menu' })}>
            ☰
        </button>
    </Control>
}
