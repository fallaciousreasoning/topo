import * as React from 'react'
import { useMap } from '../map/Map'
import Source from '../map/Source'
import Layer from '../map/Layer'
import { friendlyDistance } from '../utils/friendlyUnits'

export default function MapCursor() {
    const { map } = useMap()
    const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null)
    const [centerLocation, setCenterLocation] = React.useState<[number, number] | null>(null)
    const [labelPosition, setLabelPosition] = React.useState<{ x: number, y: number, distance: string, rotation: number, flipped: boolean } | null>(null)

    React.useEffect(() => {
        if (!map) return

        // Listen for user location updates
        const handleLocationFound = (e: any) => {
            const coords = e.coords
            setUserLocation([coords.longitude, coords.latitude])
        }

        const handleLocationError = () => {
            setUserLocation(null)
        }

        // Find the geolocation control and listen to its events
        const geoControl = map._controls.find((control: any) => control._geolocateButton)
        if (geoControl) {
            geoControl.on('geolocate', handleLocationFound)
            geoControl.on('error', handleLocationError)
            geoControl.on('outofmaxbounds', handleLocationError)
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
            }
            map.off('move', updateCenterLocation)
        }
    }, [map])

    // Create GeoJSON data for the line only
    const lineData = React.useMemo(() => {
        if (!userLocation || !centerLocation) {
            return {
                type: 'FeatureCollection' as const,
                features: []
            }
        }

        return {
            type: 'FeatureCollection' as const,
            features: [{
                type: 'Feature' as const,
                geometry: {
                    type: 'LineString' as const,
                    coordinates: [userLocation, centerLocation]
                },
                properties: {}
            }]
        }
    }, [userLocation, centerLocation])

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

        // Position label at fixed screen distance from center (opposite direction from user)
        const labelOffsetDistance = 20 // pixels from center
        const labelScreenX = window.innerWidth / 2 + normalizedDx * labelOffsetDistance
        const labelScreenY = window.innerHeight / 2 + normalizedDy * labelOffsetDistance

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

    return (
        <>
            {/* MapLibre Source and Layer for the line */}
            {userLocation && centerLocation && (
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
            {labelPosition && (
                <div 
                    className="fixed pointer-events-none z-20 px-2 py-1 text-xs font-bold text-white bg-blue-500 rounded"
                    style={{
                        left: labelPosition.x,
                        top: labelPosition.y,
                        transform: `translate(${labelPosition.flipped ? '-100%' : '0'}, -50%) rotate(${labelPosition.rotation}deg)`,
                        transformOrigin: labelPosition.flipped ? '100% 50%' : '0 50%'
                    }}
                >
                    {labelPosition.distance}
                </div>
            )}
            
            {/* Target cursor in center of screen */}
            <div 
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
                style={{ 
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
        </>
    )
}
