import { createContext, useMemo } from "react"
import { Drawing } from "./drawing"
import { useMap } from "../map/Map"
import * as React from "react"
import DrawControls from "./DrawControls"

const Context = createContext<Drawing | undefined>(undefined)

export default function (props: React.PropsWithChildren) {
    const { map } = useMap()
    const drawing = useMemo(() => new Drawing(map), [map])
    const [, setRenders] = React.useState(0)
    React.useEffect(() => {
        drawing.addListener(() => setRenders(r => r + 1))
    }, [drawing])

    return <Context.Provider value={drawing}>
        <DrawControls />
        {props.children}
    </Context.Provider>
}

export function useDrawing() {
    const drawing = React.useContext(Context)
    return drawing!
}
