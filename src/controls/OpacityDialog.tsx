import * as React from 'react'
import { createPortal } from 'react-dom'

// Local storage for opacity values
export const getOpacity = (layerId: string, defaultOpacity: number = 0.7): number => {
    const stored = localStorage.getItem(`layer-opacity-${layerId}`)
    return stored ? parseFloat(stored) : defaultOpacity
}

export const setOpacity = (layerId: string, opacity: number) => {
    localStorage.setItem(`layer-opacity-${layerId}`, opacity.toString())
}

interface OpacityDialogProps {
    layerId: string
    layerName: string
    defaultOpacity: number
    isOpen: boolean
    onClose: () => void
    onOpacityChange: (opacity: number) => void
}

export default function OpacityDialog({ layerId, layerName, defaultOpacity, isOpen, onClose, onOpacityChange }: OpacityDialogProps) {
    const [opacity, setOpacityState] = React.useState(() => getOpacity(layerId, defaultOpacity))
    const dialogRef = React.useRef<HTMLDialogElement>(null)
    
    React.useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return
        
        if (isOpen) {
            dialog.showModal()
        } else {
            dialog.close()
        }
    }, [isOpen])
    
    const handleOpacityChange = (newOpacity: number) => {
        setOpacityState(newOpacity)
        setOpacity(layerId, newOpacity)
        onOpacityChange(newOpacity)
    }
    
    const handleDialogClick = (e: React.MouseEvent) => {
        // Close when clicking on the backdrop (outside the dialog content)
        if (e.target === dialogRef.current) {
            onClose()
        }
    }
    
    return createPortal(
        <dialog 
            ref={dialogRef}
            onClick={handleDialogClick}
            onClose={onClose}
            className="bg-transparent p-0 border-0"
            style={{ 
                maxWidth: 'none',
                maxHeight: 'none'
            }}
        >
            <div className="bg-white p-4 rounded shadow-lg border" style={{ minWidth: '200px' }}>
                <div className="text-center text-sm font-medium mb-2">
                    {Math.round(opacity * 100)}%
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={opacity}
                    onChange={e => handleOpacityChange(parseFloat(e.target.value))}
                    autoFocus
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
            </div>
        </dialog>,
        document.body
    )
}
