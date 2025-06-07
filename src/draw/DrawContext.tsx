import React, { useContext, useMemo, useState } from "react"
import { Track } from "../tracks/track"
import { useMap } from "../map/Map"
import { Drawing } from "./drawing"

interface DrawContext {
    updateTrack: Drawing['updateTrack'],
    undo: Drawing['undo'],
    redo: Drawing['redo'],
    canUndo: Drawing['canUndo'],
    canRedo: Drawing['canRedo'],
    clear: Drawing['clear'],
}

const defaultTrack: Track = {
    // coordinates: []
    coordinates: [
        [
            172.72805129610947,
            -43.58415246387667
        ],
        [
            172.68434916280177,
            -43.5761618846112
        ]
    ]
}

const Context = React.createContext<DrawContext>({
    updateTrack: () => { },
    undo: () => { },
    redo: () => { },
    canUndo: false,
    canRedo: false,
    clear: () => { }
})

export function useDrawContext() {
    return useContext(Context)
}

export default function (props: React.PropsWithChildren) {
    const [stack, setStack] = useState<Track[]>([defaultTrack])
    const [redoStack, setRedoStack] = useState<Track[]>([])
    const { map } = useMap()

    const drawing = useMemo(() => new Drawing(map, defaultTrack), [stack])

    const value = useMemo<DrawContext>(() => {
        const track = stack.at(-1) ?? defaultTrack

        return {
            track,
            updateTrack: (change) => {
                const newValue = typeof change === 'function'
                    ? change(track)
                    : { ...track, ...change }
                setStack(s => [...(s ?? defaultTrack), newValue])
            },
            undo: () => {
                setRedoStack(r => [...r, track])
                setStack(r => [...r].slice(0, r.length - 1))
            },
            redo: () => {
                const last = redoStack.at(-1)!

                setRedoStack(r => [...r].slice(0, r.length - 1))
                setStack(s => [...s, last])
            },
            canUndo: !!stack.length,
            canRedo: !!redoStack.length,
            clear: () => {
                setStack(s => [...s, defaultTrack])
            }
        }

    }, [stack, redoStack])

    return <Context.Provider value={drawing}>
        {props.children}
    </Context.Provider>
}
