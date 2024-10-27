import * as React from 'react'
import Control from '../controls/Control'
import { useDrawContext } from './DrawContext'

export default function DrawControls() {
    const draw = useDrawContext()

    return <Control position='top-left'>
        <button type='button' disabled={!draw.canUndo} onClick={draw.undo}>
            ↶
        </button>
        <button type='button' disabled={!draw.canRedo} onClick={draw.redo}>
            ↷
        </button>
        <button type='button' disabled={!draw.track} onClick={draw.clear}>
            ⨯
        </button>
    </Control>
}
