import * as React from 'react'
import Control from './Control'
import { baseLayers, overlays } from '../layers/layerDefinition'
import linzAerial from '../layers/linzAerial'
import { useRoute } from '../routing/router'

export default function LayersControl() {
    const [routeParams, updateParams] = useRoute()

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

    return <Control position='top-right'>
        <button className='relative' type='button' onClick={() => setOpen(o => !o)}>
            ↔️
        </button>
        <div className='relative'>
            {open && <div className='absolute top-0 bg-white right-0 w-52 z-10 shadow rounded border-gray-300 border p-2'>
                <div>
                    <h4 className='text-foreground font-bold'>Base Maps</h4>
                    <ul>
                        {baseLayers.map(m => <li>
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
                        {overlays.map(m => <li>
                            <label className='flex items-center gap-1'>
                                <input type="checkbox" checked={routeParams.overlays.includes(m.id)} onChange={e => toggleOverlay(m.id, e.target.checked)} />
                                {m.name}
                            </label>
                        </li>)}
                    </ul>
                </div>
            </div>}
        </div>
    </Control>
}
