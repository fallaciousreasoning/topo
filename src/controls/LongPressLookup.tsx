import * as React from 'react'
import { findPlace } from '../search/nearest';
import { useRouteUpdater } from '../routing/router';
import round from '../utils/round';
import { getElevation } from '../layers/contours';
import { demSource } from '../layers/demSource';
import { useMap } from '../map/Map';
import { MapMouseEvent, MapTouchEvent } from 'maplibre-gl';
const LONG_PRESS_THRESHOLD = 500;

window['demSource'] = demSource.manager

export default function LongPressLookup() {
    const { map } = useMap()
    const updateRoute = useRouteUpdater()

    React.useEffect(() => {
        let pressStartTime: number = 0
        let pressTimeout: NodeJS.Timeout | null = null
        let hasTriggered: boolean = false
        let isDragging: boolean = false

        const startHandler = () => {
            pressStartTime = Date.now()
            hasTriggered = false
            isDragging = false
            
            if (pressTimeout) {
                clearTimeout(pressTimeout)
            }
            
            pressTimeout = setTimeout(() => {
                if (!isDragging) {
                    hasTriggered = true
                }
            }, LONG_PRESS_THRESHOLD)
        }

        const endHandler = async (e: MapMouseEvent | MapTouchEvent) => {
            if (pressTimeout) {
                clearTimeout(pressTimeout)
                pressTimeout = null
            }

            // Don't trigger if we were dragging
            if (isDragging) {
                isDragging = false
                return
            }

            const elapsed = Date.now() - pressStartTime
            if (elapsed < LONG_PRESS_THRESHOLD && !hasTriggered) return

            const lat = e.lngLat.lat
            const lon = e.lngLat.lng

            const closestPoint = await findPlace(lat, lon)

            const elevation = round(await getElevation([lat, lon], map.getZoom()), 0)

            const update = {
                lla: parseFloat(closestPoint?.lat ?? '') || lat,
                llo: parseFloat(closestPoint?.lon ?? '') || lon,
                lab: (closestPoint?.name ?? `Lat/Lon: ${round(lon)}, ${round(lat)}`) + ` (${elevation}m)`
            }

            updateRoute(update)
        }

        const cancelHandler = () => {
            if (pressTimeout) {
                clearTimeout(pressTimeout)
                pressTimeout = null
            }
            hasTriggered = false
            isDragging = true
        }

        const dragStartHandler = () => {
            isDragging = true
            if (pressTimeout) {
                clearTimeout(pressTimeout)
                pressTimeout = null
            }
            hasTriggered = false
        }

        // Handle both mouse and touch events
        map.on('mousedown', startHandler)
        map.on('touchstart', startHandler)
        map.on('click', endHandler)
        map.on('touchend', endHandler)
        
        // Cancel long press on move and drag events
        map.on('mousemove', cancelHandler)
        map.on('touchmove', cancelHandler)
        map.on('dragstart', dragStartHandler)
        map.on('movestart', dragStartHandler)

        return () => {
            if (pressTimeout) {
                clearTimeout(pressTimeout)
            }
            
            map.off('mousedown', startHandler)
            map.off('touchstart', startHandler)
            map.off('click', endHandler)
            map.off('touchend', endHandler)
            map.off('mousemove', cancelHandler)
            map.off('touchmove', cancelHandler)
            map.off('dragstart', dragStartHandler)
            map.off('movestart', dragStartHandler)
        }
    }, [])
    return null
}
