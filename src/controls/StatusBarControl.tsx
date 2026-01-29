import * as React from 'react'
import Control from './Control'
import { useMap } from '../map/Map'
import { getElevation } from '../layers/contours'
import { findPlace } from '../search/nearest'
import { slopeAngleSource } from '../layers/slopeAngle'
import round from '../utils/round'
import { useRouteUpdater } from '../routing/router'
import db from '../caches/indexeddb'
import { Point } from '../tracks/point'

export default function StatusBarControl() {
    const { map } = useMap()
    const updateRoute = useRouteUpdater()
    const [position, setPosition] = React.useState<{ lng: number, lat: number } | null>(null)
    const [elevation, setElevation] = React.useState<number | null>(null)
    const [place, setPlace] = React.useState<any | null>(null)
    const [slopeAngle, setSlopeAngle] = React.useState<number | null>(null)
    const [isTouchDevice, setIsTouchDevice] = React.useState(false)
    const [existingPoint, setExistingPoint] = React.useState<Point | null>(null)

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
                console.log('Mouse left map')
                setPosition(null)
                setElevation(null)
            }

            // Also listen to the map container events
            const container = map.getContainer()
            const handleContainerMouseLeave = () => {
                console.log('Mouse left container')
                setPosition(null)
                setElevation(null)
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
            setExistingPoint(null)
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
            // Fetch elevation, place name, slope angle, and check for existing point concurrently
            Promise.all([
                getElevation([position.lat, position.lng], zoom, abortController)
                    .catch(() => null),
                findPlace(position.lat, position.lng)
                    .catch(() => null),
                slopeAngleSource.calculatePointSlope(position.lat, position.lng, zoom)
                    .catch(() => null),
                db.findPointByCoordinates(position.lng, position.lat)
                    .catch(() => null)
            ]).then(([elevationValue, placeData, slope, point]) => {
                if (!abortController.signal.aborted) {
                    setElevation(elevationValue)
                    setPlace(placeData)
                    setSlopeAngle(slope)
                    setExistingPoint(point)
                }
            }).catch(() => {
                // Fallback in case Promise.all fails entirely
                if (!abortController.signal.aborted) {
                    setElevation(null)
                    setPlace(null)
                    setSlopeAngle(null)
                    setExistingPoint(null)
                }
            })
        }, delay)

        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current)
            }
        }
    }, [position])

    // Only show on touch devices or when mouse is over map on desktop
    const shouldShow = isTouchDevice || position

    const isMountain = place?.type === 'peak' && place?.href

    const handlePlaceClick = () => {
        if (isMountain && place?.href) {
            updateRoute({
                page: `mountain/${encodeURIComponent(place.href)}`
            })
        }
    }

    const handleSavePoint = async () => {
        if (!position) return

        const placeName = place?.name
            ? `${place.name} (${round(elevation || 0, 0)}m)`
            : `${round(position.lat, 6)}, ${round(position.lng, 6)}`

        const point = await db.updatePoint({
            coordinates: [position.lng, position.lat],
            tags: [],
            name: placeName,
            color: "#3b82f6",
        })

        setExistingPoint(point)
        updateRoute({
            page: `point/${point.id}`,
        })
    }

    const handleEditPoint = () => {
        if (!existingPoint) return

        updateRoute({
            page: `point/${existingPoint.id}`,
        })
    }

    const handleRemovePoint = async () => {
        if (!existingPoint) return

        await db.deletePoint(existingPoint)
        setExistingPoint(null)
    }

    return shouldShow ? (
        <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
            <div className="bg-white bg-opacity-90 text-black text-xs px-3 py-2 rounded">
                {place?.name && (
                    <div className="font-semibold whitespace-nowrap text-center mb-1 flex items-center justify-center gap-2">
                        {isMountain ? (
                            <button
                                className="text-blue-600 hover:text-blue-800 underline pointer-events-auto"
                                onClick={handlePlaceClick}
                            >
                                {place.name}
                            </button>
                        ) : (
                            <span>{place.name}</span>
                        )}
                        <div className="flex gap-1 pointer-events-auto">
                            {existingPoint && (
                                <button
                                    onClick={handleEditPoint}
                                    className="text-xs border rounded px-1 py-0.5 hover:bg-gray-100 transition-colors"
                                    title="Edit point"
                                >
                                    ✏️
                                </button>
                            )}
                            {existingPoint ? (
                                <button
                                    onClick={handleRemovePoint}
                                    className="text-xs border rounded px-1 py-0.5 hover:bg-yellow-50 transition-colors"
                                    style={{ color: '#fbbf24' }}
                                    title="Remove saved point"
                                >
                                    ★
                                </button>
                            ) : (
                                <button
                                    onClick={handleSavePoint}
                                    className="text-xs border rounded px-1 py-0.5 hover:bg-gray-100 transition-colors"
                                    title="Save point"
                                >
                                    ☆
                                </button>
                            )}
                        </div>
                    </div>
                )}
                <div className="flex items-center space-x-3 min-w-0">
                    <span className="whitespace-nowrap">
                        {position ? `${round(position.lat, 6)}, ${round(position.lng, 6)}` : 'No position'}
                    </span>
                    {elevation !== null && (
                        <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold whitespace-nowrap">
                            {round(elevation, 0)}m
                        </span>
                    )}
                    {slopeAngle !== null && (
                        <span className="px-2 py-1 bg-orange-600 text-white rounded text-xs font-bold whitespace-nowrap">
                            {round(slopeAngle, 1)}°
                        </span>
                    )}
                </div>
            </div>
        </div>
    ) : null
}
