import * as React from 'react';
import { createPortal } from 'react-dom';
import { useMap } from '../map/Map';

interface Props {
    position: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-left'
}

export default function Control(props: Props & React.PropsWithChildren) {
    const { map } = useMap()
    const container = React.useMemo(() => map.getContainer().querySelector(`.maplibregl-control-container > .maplibregl-ctrl-${props.position}`)!
        , [map, props.position])
    return createPortal(<div className='maplibregl-ctrl maplibregl-ctrl-group'>
        {props.children}
    </div>, container)
}
