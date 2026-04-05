import * as React from 'react'
import { useMap } from '../map/Map'
import Source from '../map/Source'
import Layer from '../map/Layer'
import { friendlyDistance } from '../utils/friendlyUnits'
import { useSetting } from '../utils/settings'
import { RoutingManager } from '../draw/routingManager'
import { getLineLength } from '../utils/distance'
import { publishHasLocation } from '../utils/userLocationSignal'
import { closestPointOnPolyline } from '../utils/vector'

export default function MapCursor() {
    const { map } = useMap()
    const cursorMode = useSetting('cursorMode')
    const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null)
    const [centerLocation, setCenterLocation] = React.useState<[number, number] | null>(null)
    const [labelPosition, setLabelPosition] = React.useState<{ x: number, y: number, distance: string, rotation: number, flipped: boolean } | null>(null)
    const [isInteracting, setIsInteracting] = React.useState(false)
    const [isTouchDevice, setIsTouchDevice] = React.useState(false)
    const [routedDistanceM, setRoutedDistanceM] = React.useState<number | null>(null)
    const [routedCoords, setRoutedCoords] = React.useState<[number, number][] | null>(null)

    const routingManagerRef = React.useRef<RoutingManager | null>(null)
    if (!routingManagerRef.current) {
        routingManagerRef.current = new RoutingManager()
    }
    React.useEffect(() => {
        return () => { routingManagerRef.current?.destroy() }
    }, [])

    // Detect touch device
    React.useEffect(() => {
        const checkTouchDevice = () => {
            setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
        }
        checkTouchDevice()
        window.addEventListener('resize', checkTouchDevice)
        return () => window.removeEventListener('resize', checkTouchDevice)
    }, [])

    React.useEffect(() => {
        if (!map) return

        // Listen for user location updates
        const handleLocationFound = (e: any) => {
            const coords = e.coords
            setUserLocation([coords.longitude, coords.latitude])
            publishHasLocation(true)
        }

        const handleLocationError = () => {
            setUserLocation(null)
            publishHasLocation(false)
        }

        // Find the geolocation control and listen to its events
        const geoControl = map._controls.find((control: any) => control._geolocateButton)

        const handleButtonClick = () => {
            // Check state after click has been processed
            setTimeout(() => {
                if (geoControl && geoControl._watchState === 'OFF') {
                    setUserLocation(null)
                    publishHasLocation(false)
                }
            }, 0)
        }

        if (geoControl) {
            geoControl.on('geolocate', handleLocationFound)
            geoControl.on('error', handleLocationError)
            geoControl.on('outofmaxbounds', handleLocationError)

            // Listen for button clicks to detect when geolocation is turned off
            const button = geoControl._geolocateButton
            if (button) {
                button.addEventListener('click', handleButtonClick)
            }
        }

        // Update center location when map moves
        const updateCenterLocation = () => {
            const center = map.getCenter()
            setCenterLocation([center.lng, center.lat])
        }

        updateCenterLocation()
        map.on('move', updateCenterLocation)

        return () => {
            if (geoControl) {
                geoControl.off('geolocate', handleLocationFound)
                geoControl.off('error', handleLocationError)
                geoControl.off('outofmaxbounds', handleLocationError)

                const button = geoControl._geolocateButton
                if (button) {
                    button.removeEventListener('click', handleButtonClick)
                }
            }
            map.off('move', updateCenterLocation)
        }
    }, [map])

    // Try to find routed distance between user location and map center
    React.useEffect(() => {
        if (!userLocation || !centerLocation) {
            setRoutedCoords(null)
            setRoutedDistanceM(null)
            return
        }

        let cancelled = false
        const timer = setTimeout(async () => {
            const coords = await routingManagerRef.current!.route(userLocation, centerLocation)
            if (cancelled) return
            if (coords) console.log('Found route with', coords.length, 'points, distance:', getLineLength(coords) * 1000, 'm')
            setRoutedCoords(coords)
            setRoutedDistanceM(coords ? getLineLength(coords) * 1000 : null)
        }, 200)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [userLocation, centerLocation])

    // Handle automatic mode interaction detection
    React.useEffect(() => {
        if (!map || cursorMode !== 'automatic') {
            setIsInteracting(false)
            return
        }

        const handleInteractionStart = () => {
            setIsInteracting(true)
        }

        const handleInteractionEnd = () => {
            setIsInteracting(false)
        }

        // Map interaction events - show on start, hide on end
        map.on('mousedown', handleInteractionStart)
        map.on('touchstart', handleInteractionStart)
        map.on('dragstart', handleInteractionStart)
        map.on('movestart', handleInteractionStart)
        map.on('zoomstart', handleInteractionStart)
        map.on('wheel', handleInteractionStart)

        map.on('mouseup', handleInteractionEnd)
        map.on('touchend', handleInteractionEnd)
        map.on('dragend', handleInteractionEnd)
        map.on('moveend', handleInteractionEnd)
        map.on('zoomend', handleInteractionEnd)

        return () => {
            map.off('mousedown', handleInteractionStart)
            map.off('touchstart', handleInteractionStart)
            map.off('dragstart', handleInteractionStart)
            map.off('movestart', handleInteractionStart)
            map.off('zoomstart', handleInteractionStart)
            map.off('wheel', handleInteractionStart)

            map.off('mouseup', handleInteractionEnd)
            map.off('touchend', handleInteractionEnd)
            map.off('dragend', handleInteractionEnd)
            map.off('moveend', handleInteractionEnd)
            map.off('zoomend', handleInteractionEnd)
        }
    }, [map, cursorMode])

    // Create GeoJSON data for the line only
    const lineData = React.useMemo(() => {
        if (!userLocation || !centerLocation) {
            return { type: 'FeatureCollection' as const, features: [] }
        }

        if (routedCoords && routedCoords.length >= 2) {
            const snapToUser = closestPointOnPolyline(userLocation, routedCoords)
            const snapToCenter = closestPointOnPolyline(centerLocation, routedCoords)
            return {
                type: 'FeatureCollection' as const,
                features: [
                    {
                        type: 'Feature' as const,
                        geometry: { type: 'LineString' as const, coordinates: routedCoords },
                        properties: { lineType: 'route' }
                    },
                    {
                        type: 'Feature' as const,
                        geometry: { type: 'LineString' as const, coordinates: [userLocation, snapToUser] },
                        properties: { lineType: 'approach' }
                    },
                    {
                        type: 'Feature' as const,
                        geometry: { type: 'LineString' as const, coordinates: [snapToCenter, centerLocation] },
                        properties: { lineType: 'approach' }
                    },
                ]
            }
        }

        return {
            type: 'FeatureCollection' as const,
            features: [{
                type: 'Feature' as const,
                geometry: { type: 'LineString' as const, coordinates: [userLocation, centerLocation] },
                properties: { lineType: 'route' }
            }]
        }
    }, [userLocation, centerLocation, routedCoords])

    // Calculate label position and distance for DOM rendering
    React.useEffect(() => {
        if (!map || !userLocation || !centerLocation) {
            setLabelPosition(null)
            return
        }

        // Calculate distance using Haversine formula
        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
            const R = 6371e3 // Earth's radius in meters
            const φ1 = lat1 * Math.PI / 180
            const φ2 = lat2 * Math.PI / 180
            const Δφ = (lat2 - lat1) * Math.PI / 180
            const Δλ = (lon2 - lon1) * Math.PI / 180

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

            return R * c
        }

        const distance = calculateDistance(userLocation[1], userLocation[0], centerLocation[1], centerLocation[0])
        const distanceText = friendlyDistance(distance)

        // Calculate label position in screen coordinates
        const userScreenCoords = map.project(userLocation)
        const centerScreenCoords = map.project(centerLocation)

        // Calculate direction vector from user to center in screen space
        const dx = centerScreenCoords.x - userScreenCoords.x
        const dy = centerScreenCoords.y - userScreenCoords.y
        
        // Normalize the direction vector
        const length = Math.sqrt(dx * dx + dy * dy)
        let normalizedDx = 0
        let normalizedDy = 0
        
        if (length > 0) {
            normalizedDx = dx / length
            normalizedDy = dy / length
        }

        // Get the actual map container dimensions
        const container = map.getContainer()
        const rect = container.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        
        // Position label at fixed screen distance from center (opposite direction from user)
        const labelOffsetDistance = 20 // pixels from center
        const labelScreenX = centerX + normalizedDx * labelOffsetDistance
        const labelScreenY = centerY + normalizedDy * labelOffsetDistance

        // Calculate rotation angle (in degrees) from the direction vector
        let rotationAngle = Math.atan2(normalizedDy, normalizedDx) * (180 / Math.PI)
        let shouldFlip = false

        // Flip text when it would be upside down (pointing left)
        if (rotationAngle > 90 || rotationAngle < -90) {
            rotationAngle += 180
            shouldFlip = true
        }

        setLabelPosition({
            x: labelScreenX,
            y: labelScreenY,
            distance: distanceText,
            rotation: rotationAngle,
            flipped: shouldFlip
        })
    }, [map, userLocation, centerLocation])

    // Update the source data when lineData changes
    React.useEffect(() => {
        if (!map) return
        
        const lineSource = map.getSource('cursor-line-source') as any
        if (lineSource && lineSource.setData) {
            lineSource.setData(lineData)
        }
    }, [map, lineData])

    // Calculate the actual center of the map container
    const mapCenter = React.useMemo(() => {
        if (!map) return { x: 0, y: 0 }
        const container = map.getContainer()
        const rect = container.getBoundingClientRect()
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        }
    }, [map, labelPosition]) // Recalculate when labelPosition updates (which happens on map moves)

    // Determine if cursor should be visible
    const shouldShowCursor = React.useMemo(() => {
        // On desktop, require user location to be active
        if (!isTouchDevice && !userLocation) return false

        switch (cursorMode) {
            case 'always':
                return true
            case 'never':
                return false
            case 'automatic':
                return isInteracting
            default:
                return false
        }
    }, [cursorMode, isInteracting, userLocation, isTouchDevice])

    // Show line only when we have both user location and cursor is visible
    const shouldShowLine = shouldShowCursor && userLocation && centerLocation

    return (
        <>
            {/* MapLibre Source and Layer for the line */}
            {shouldShowLine && (
                <>
                    <Source
                        id="cursor-line-source"
                        spec={{
                            type: 'geojson',
                            data: lineData
                        }}
                    />
                    <Layer
                        layer={{
                            id: 'cursor-line',
                            type: 'line',
                            source: 'cursor-line-source',
                            filter: ['==', ['get', 'lineType'], 'route'],
                            paint: {
                                'line-color': '#000000',
                                'line-width': 2,
                                'line-opacity': 0.7
                            }
                        }}
                    />
                    <Layer
                        layer={{
                            id: 'cursor-line-approach',
                            type: 'line',
                            source: 'cursor-line-source',
                            filter: ['==', ['get', 'lineType'], 'approach'],
                            paint: {
                                'line-color': '#000000',
                                'line-width': 2,
                                'line-opacity': 0.7
                            }
                        }}
                    />
                </>
            )}

            {/* DOM-based distance label */}
            {shouldShowLine && labelPosition && (
                <div 
                    className="fixed pointer-events-none z-20 px-2 py-1 text-xs font-bold text-white bg-blue-500 rounded"
                    style={{
                        left: labelPosition.x,
                        top: labelPosition.y,
                        transform: `translate(${labelPosition.flipped ? '-100%' : '0'}, -50%) rotate(${labelPosition.rotation}deg)`,
                        transformOrigin: labelPosition.flipped ? '100% 50%' : '0 50%'
                    }}
                >
                    {routedDistanceM !== null ? friendlyDistance(routedDistanceM) : labelPosition.distance}
                </div>
            )}
            
            {/* Target cursor in center of screen */}
            {shouldShowCursor && (
                <div 
                    className="fixed pointer-events-none z-10"
                    style={{
                        left: mapCenter.x,
                        top: mapCenter.y,
                        transform: 'translate(-50%, -50%)',
                        width: '24px', 
                        height: '24px'
                    }}
            >
                {/* Outer circle */}
                <div 
                    className="absolute inset-0 border-2 border-black rounded-full"
                    style={{
                        backgroundColor: 'transparent',
                        boxShadow: '0 0 4px rgba(0, 0, 0, 0.3)'
                    }}
                />
                
                {/* Inner dot */}
                <div 
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black rounded-full"
                    style={{
                        width: '4px',
                        height: '4px'
                    }}
                />
                
                {/* Crosshairs */}
                <div 
                    className="absolute top-1/2 left-0 transform -translate-y-1/2 bg-black"
                    style={{
                        width: '8px',
                        height: '2px',
                        marginLeft: '-2px'
                    }}
                />
                <div 
                    className="absolute top-1/2 right-0 transform -translate-y-1/2 bg-black"
                    style={{
                        width: '8px',
                        height: '2px',
                        marginRight: '-2px'
                    }}
                />
                <div 
                    className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-black"
                    style={{
                        width: '2px',
                        height: '8px',
                        marginTop: '-2px'
                    }}
                />
                <div 
                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-black"
                    style={{
                        width: '2px',
                        height: '8px',
                        marginBottom: '-2px'
                    }}
                />
                </div>
            )}
        </>
    )
}
