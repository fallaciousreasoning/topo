import { useEffect, useRef, useState } from "react";
import { GeoJSONSource, useMap } from "react-map-gl";
import { useLayerHandler } from "../hooks/useLayerClickHandler";

// export function useDrag() {
//     const mapRef = useMap()
//     const map = mapRef.current!

//     const [draggedPos, setDraggedPos] = useState<[number, number]>()
//     const [offset, setOffset] = useState<[number, number] | undefined>()

//     useEffect(() => {
//         if (!offset) return

//         const handler = () => {

//         }
//         map.on('mousemove', handler)

//         return () => {
//             map.off('ha')
//         }
//     }, [offset])

//     return {
//     }
// }

export const useMakeLayerDraggable = (layerId: string, updateFeature: (geom?: GeoJSON.Feature<GeoJSON.Point>) => void) => {
    const mapRef = useMap()
    const map = mapRef.current!
    const dragging = useRef<GeoJSON.Feature>()

    map.on('mou')

    // Offset at initial click from the actual point
    const [offset, setOffset] = useState<[number, number]>()
    const [mouse, setMouse] = useState<[number, number]>()

    // Whether we're currently dragging
    const [isDragging, setIsDragging] = useState(false)

    useLayerHandler('mousedown', layerId, e => {
        const feature = e.features?.[0]
        if (!feature) return

        if (feature.geometry?.type !== 'Point') throw new Error("Can currently only move points!")

        e.preventDefault()

        const mouse = e.lngLat.toArray() as [number, number]

        setIsDragging(true)
        setOffset([feature.geometry.coordinates[0] - mouse[0], feature.geometry.coordinates[1] - mouse[1]])
        dragging.current = feature
    })

    useEffect(() => {
        const handler = e => {
            setMouse(e.lngLat.toArray())
        }

        map.on('mousemove', handler)
        return () => {
            map.off('mousemove', handler)
        }
    }, [])

    // Handle finishing the drag by mouseup
    useEffect(() => {
        if (!isDragging) return

        const doneHandler = () => {
            setIsDragging(false)
            updateFeature(undefined)
        }

        map.on('mouseup', doneHandler)
        return () => {
            map.off('mouseup', doneHandler)
        }

    }, [isDragging, updateFeature])


    // Handle updating the dragged position
    useEffect(() => {
        if (!isDragging) return

        const updatedFeature = {
            ...dragging.current!,
            geometry: {
                ...dragging.current!.geometry,
                coordinates: [
                    mouse![0] + offset![0],
                    mouse![1] + offset![1],
                ]
            }
        }

        updateFeature(updatedFeature as any)
    }, [mouse, offset, isDragging])
}
