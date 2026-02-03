import * as React from 'react'
import Control from './Control'
import { useRouteUpdater, useParams } from '../routing/router'

export default function MenuControl() {
    const updateRoute = useRouteUpdater()
    const params = useParams()

    const handleClick = () => {
        if (params.page) {
            // If a page is open, close it
            updateRoute({ page: null })
        } else {
            // If no page is open, open the menu
            updateRoute({ page: 'menu' })
        }
    }

    return <Control position='top-left'>
        <button type='button' onClick={handleClick}>
            ☰
        </button>
    </Control>
}
