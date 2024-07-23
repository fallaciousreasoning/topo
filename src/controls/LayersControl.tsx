import * as React from 'react'
import Control from './Control'
import { baseLayers, overlays } from '../layers/layerDefinition'
import { useParams, useRouteUpdater } from '../routing/router'

export default function LayersControl() {
    const routeParams = useParams()
    const updateParams = useRouteUpdater()
    const menuRef = React.useRef<HTMLDivElement>(null)

    const [open, setOpen] = React.useState(false)
    const toggleOverlay = (overlayId: string, checked: boolean) => {
        if (checked) {
            updateParams({
                overlays: [...routeParams.overlays, overlayId]
            })
        } else {
            updateParams({
                overlays: routeParams.overlays.filter(r => r !== overlayId)
            })
        }
    }

    React.useLayoutEffect(() => {
        if (!open) return

        const handler = (e: MouseEvent) => {
            if (!e.composedPath().includes(menuRef.current!))
                setOpen(false)
        }
        document.addEventListener('click',  handler)
        return () => {
            document.removeEventListener('click', handler)
        }
    }, [open])

    return <Control position='top-right'>
        <div className='relative inline' ref={menuRef}>
            {open && <div className='absolute top-0 bg-white right-1 w-52 z-10 shadow rounded border-gray-300 border p-2'>
                <div>
                    <h4 className='text-foreground font-bold'>Base Maps</h4>
                    <ul>
                        {baseLayers.map(m => <li key={m.id}>
                            <label className='flex items-center gap-1'>
                                <input type="radio" value={m.id} checked={routeParams.basemap === m.id} onChange={e => updateParams({ basemap: m.id })} />
                                {m.name}
                            </label>
                        </li>)}
                    </ul>
                </div>
                <hr className='my-2' />
                <div>
                    <h4 className='text-foreground font-bold'>
                        Overlays
                    </h4>
                    <ul>
                        {overlays.map(m => <li key={m.id}>
                            <label className='flex items-center gap-1'>
                                <input type="checkbox" checked={routeParams.overlays.includes(m.id)} onChange={e => toggleOverlay(m.id, e.target.checked)} />
                                {m.name}
                            </label>
                        </li>)}
                    </ul>
                </div>
            </div>}
        </div>
        <button className='relative' type='button' onClick={(e) => {
            setOpen(o => !o)
            e.stopPropagation()
        }}>
            ↔️
        </button>
    </Control>
}
