import * as React from 'react'
import Control from './Control'
import { baseLayers, overlays } from '../layers/layerDefinition'
import { useParams, useRouteUpdater } from '../routing/router'
import { useMap } from '../map/Map'
import OpacityDialog, { getOpacity } from './OpacityDialog'

export default function LayersControl() {
    const routeParams = useParams()
    const updateParams = useRouteUpdater()
    const menuRef = React.useRef<HTMLDivElement>(null)
    const { map } = useMap()

    const [open, setOpen] = React.useState(false)
    const [opacityDialog, setOpacityDialog] = React.useState<{ layerId: string, layerName: string, defaultOpacity: number } | null>(null)
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

    const handleOpacityChange = (layerId: string, opacity: number) => {
        if (!map) return

        // Update different layer types based on the layer ID
        if (layerId === 'hillshade') {
            map.setPaintProperty('hillshade', 'hillshade-opacity', opacity)
        } else if (layerId === 'contour-source') {
            map.setPaintProperty('contour-lines', 'line-opacity', opacity)
            map.setPaintProperty('contour-labels', 'text-opacity', opacity)
        } else if (layerId === 'slope-angle') {
            map.setPaintProperty('slope-angle', 'raster-opacity', opacity)
        } else if (layerId === 'utm-grid') {
            map.setPaintProperty('utm-grid-lines', 'line-opacity', opacity)
        }
    }

    const openOpacityDialog = (layerId: string, layerName: string, defaultOpacity: number) => {
        setOpacityDialog({ layerId, layerName, defaultOpacity })
        setOpen(false) // Close the layers menu when opening opacity dialog
    }

    const closeOpacityDialog = () => {
        setOpacityDialog(null)
    }

    // Apply stored opacity values when layers are loaded
    React.useEffect(() => {
        if (!map) return
        
        const applyStoredOpacities = () => {
            overlays.forEach(overlay => {
                if (overlay.defaultOpacity !== undefined && routeParams.overlays.includes(overlay.id)) {
                    const opacity = getOpacity(overlay.id, overlay.defaultOpacity)
                    handleOpacityChange(overlay.id, opacity)
                }
            })
        }
        
        // Apply opacities after a short delay to ensure layers are loaded
        const timeoutId = setTimeout(applyStoredOpacities, 100)
        return () => clearTimeout(timeoutId)
    }, [map, routeParams.overlays])

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
                        {overlays.map(m => <li key={m.id} className="flex items-center justify-between gap-2">
                            <label className='flex items-center gap-1 flex-1'>
                                <input type="checkbox" checked={routeParams.overlays.includes(m.id)} onChange={e => toggleOverlay(m.id, e.target.checked)} />
                                {m.name}
                            </label>
                            {m.defaultOpacity !== undefined && routeParams.overlays.includes(m.id) && (
                                <button
                                    onClick={() => openOpacityDialog(m.id, m.name, m.defaultOpacity!)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline text-xs cursor-pointer !bg-transparent !p-0 !h-auto"
                                    title={`Adjust ${m.name} opacity`}
                                >
                                    {Math.round(getOpacity(m.id, m.defaultOpacity) * 100)}%
                                </button>
                            )}
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
        
        {opacityDialog && (
            <OpacityDialog
                layerId={opacityDialog.layerId}
                layerName={opacityDialog.layerName}
                defaultOpacity={opacityDialog.defaultOpacity}
                isOpen={true}
                onClose={closeOpacityDialog}
                onOpacityChange={(opacity) => handleOpacityChange(opacityDialog.layerId, opacity)}
            />
        )}
    </Control>
}
