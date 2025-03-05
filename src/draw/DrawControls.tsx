import * as React from 'react'
import Control from '../controls/Control'
import { useDrawing } from './Drawing'

export default function DrawControls() {
    const drawing = useDrawing()

    return <Control position='top-left'>
        <button type='button' disabled={!drawing.canUndo} onClick={() => drawing.undo()}>
            ↶
        </button>
        <button type='button' disabled={!drawing.canRedo} onClick={() => drawing.redo()}>
            ↷
        </button>
        <button type='button' disabled={!drawing.canClear} onClick={() => drawing.clear()}>
            ⨯
        </button>
    </Control>
}
