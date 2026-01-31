import * as React from 'react'
import { useMap } from '../map/Map'
import { getElevation } from '../layers/contours'
import { findPlace } from '../search/nearest'
import { slopeAngleSource } from '../layers/slopeAngle'
import round from '../utils/round'
import { useParams } from '../routing/router'
import { useSetting } from '../utils/settings'

export default function StatusBar() {
    const { map } = useMap()
    const params = useParams()
    const statusBarMode = useSetting('statusBarMode')
    const [position, setPosition] = React.useState<{ lng: number, lat: number } | null>(null)
    const [elevation, setElevation] = React.useState<number | null>(null)
    const [place, setPlace] = React.useState<any | null>(null)
    const [slopeAngle, setSlopeAngle] = React.useState<number | null>(null)
    const [isTouchDevice, setIsTouchDevice] = React.useState(false)

    // Detect touch device
    React.useEffect(() => {
        const checkTouchDevice = () => {
            setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
        }
        checkTouchDevice()
        window.addEventListener('resize', checkTouchDevice)
        return () => window.removeEventListener('resize', checkTouchDevice)
    }, [])

    // Track position based on device type
    React.useEffect(() => {
        if (!map) return

        if (isTouchDevice) {
            // For touch devices, use center position
            const updateCenterPosition = () => {
                const center = map.getCenter()
                setPosition({ lng: center.lng, lat: center.lat })
            }

            updateCenterPosition()
            map.on('move', updateCenterPosition)

            return () => {
                map.off('move', updateCenterPosition)
            }
        } else {
            // For desktop, use mouse position
            const handleMouseMove = (e: any) => {
                setPosition({
                    lng: e.lngLat.lng,
                    lat: e.lngLat.lat
                })
            }

            const handleMouseLeave = () => {
                setPosition(null)
                setElevation(null)
                setSlopeAngle(null)
            }

            // Also listen to the map container events
            const container = map.getContainer()
            const handleContainerMouseLeave = () => {
                setPosition(null)
                setElevation(null)
                setSlopeAngle(null)
            }

            map.on('mousemove', handleMouseMove)
            map.on('mouseleave', handleMouseLeave)
            container.addEventListener('mouseleave', handleContainerMouseLeave)

            return () => {
                map.off('mousemove', handleMouseMove)
                map.off('mouseleave', handleMouseLeave)
                container.removeEventListener('mouseleave', handleContainerMouseLeave)
            }
        }
    }, [map, isTouchDevice])

    // Throttled elevation fetching
    const lastFetchTimeRef = React.useRef(0)
    const fetchTimeoutRef = React.useRef<NodeJS.Timeout>()

    React.useEffect(() => {
        if (!position) {
            setElevation(null)
            setPlace(null)
            setSlopeAngle(null)
            return
        }

        // Clear any pending fetch
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current)
        }

        // Throttle requests to every 50ms
        const now = Date.now()
        const timeSinceLastFetch = now - lastFetchTimeRef.current
        const delay = Math.max(0, 50 - timeSinceLastFetch)

        fetchTimeoutRef.current = setTimeout(() => {
            lastFetchTimeRef.current = Date.now()

            const abortController = new AbortController()
            const zoom = map.getZoom()

            // First find the place, then use its coordinates for elevation/slope
            findPlace(position.lat, position.lng)
                .catch(() => null)
                .then((placeData) => {
                    // Use place coordinates if found, otherwise use position
                    const lat = placeData ? parseFloat(placeData.lat) : position.lat
                    const lng = placeData ? parseFloat(placeData.lon) : position.lng

                    // Fetch elevation and slope angle at the place's location
                    return Promise.all([
                        getElevation([lat, lng], zoom, abortController)
                            .catch(() => null),
                        slopeAngleSource.calculatePointSlope(lat, lng, zoom)
                            .catch(() => null),
                        Promise.resolve(placeData),
                        Promise.resolve({ lat, lng })
                    ])
                })
                .then(([elevationValue, slope, placeData, coords]) => {
                    if (!abortController.signal.aborted) {
                        // Update position to match the place if we found one
                        if (coords) {
                            setPosition(prev => {
                                if (prev?.lng === coords.lng && prev?.lat === coords.lat) {
                                    return prev
                                }
                                return { lng: coords.lng, lat: coords.lat }
                            })
                        }
                        setElevation(elevationValue)
                        setPlace(placeData)
                        setSlopeAngle(slope)
                    }
                }).catch(() => {
                // Fallback in case Promise.all fails entirely
                if (!abortController.signal.aborted) {
                    setElevation(null)
                    setPlace(null)
                    setSlopeAngle(null)
                }
            })
        }, delay)

        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current)
            }
        }
    }, [position])

    // Check if status bar should show based on mode
    const hasPopup = params.lla && params.llo && params.lab
    const shouldShow = statusBarMode === 'always'
        ? (isTouchDevice || position)
        : hasPopup

    return shouldShow ? (
        <div className="fixed bottom-0 right-0 pointer-events-none z-10">
            <div className="bg-white bg-opacity-90 text-black px-2 py-1 rounded-tl" style={{ fontSize: '10px' }}>
                <div className="flex items-center space-x-2 min-w-0">
                    {place?.name && (
                        <span className="whitespace-nowrap font-semibold">
                            {place.name}
                        </span>
                    )}
                    <span className="whitespace-nowrap">
                        {position ? `${round(position.lat, 6)}, ${round(position.lng, 6)}` : 'No position'}
                    </span>
                    {elevation !== null && (
                        <span className="whitespace-nowrap text-gray-600">
                            Ele: {round(elevation, 0)}m
                        </span>
                    )}
                    {slopeAngle !== null && (
                        <span className="whitespace-nowrap text-gray-600">
                            Angl: {round(slopeAngle, 1)}°
                        </span>
                    )}
                </div>
            </div>
        </div>
    ) : null
}
