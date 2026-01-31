import * as React from 'react'
import { useMap } from '../map/Map'
import { getElevation } from '../layers/contours'
import { findPlace } from '../search/nearest'
import round from '../utils/round'
import { useRouteUpdater, useParams } from '../routing/router'
import db from '../caches/indexeddb'
import { Point } from '../tracks/point'
import { shareLocation } from '../utils/share'
import StatusBarButton from '../components/StatusBarButton'

export default function InfoBox() {
    const { map } = useMap()
    const params = useParams()
    const updateRoute = useRouteUpdater()
    const [position, setPosition] = React.useState<{ lng: number, lat: number } | null>(null)
    const [elevation, setElevation] = React.useState<number | null>(null)
    const [place, setPlace] = React.useState<any | null>(null)
    const [existingPoint, setExistingPoint] = React.useState<Point | null>(null)

    const hasPopup = params.lla && params.llo && params.lab

    // Track position only when popup is open
    React.useEffect(() => {
        if (!map || !hasPopup) return

        // Pin to popup location using functional setState to avoid infinite loops
        setPosition(prev => {
            if (prev?.lng === params.llo && prev?.lat === params.lla) {
                return prev
            }
            return { lng: params.llo!, lat: params.lla! }
        })
    }, [map, hasPopup, params.lla, params.llo, params.lab])

    // Throttled elevation fetching
    const lastFetchTimeRef = React.useRef(0)
    const fetchTimeoutRef = React.useRef<NodeJS.Timeout>()

    React.useEffect(() => {
        if (!position) {
            setElevation(null)
            setPlace(null)
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

            // First find the place, then use its coordinates for elevation
            findPlace(position.lat, position.lng)
                .catch(() => null)
                .then((placeData) => {
                    // Use place coordinates if found, otherwise use position
                    const lat = placeData ? parseFloat(placeData.lat) : position.lat
                    const lng = placeData ? parseFloat(placeData.lon) : position.lng

                    // Fetch elevation at the place's location
                    return Promise.all([
                        getElevation([lat, lng], zoom, abortController)
                            .catch(() => null),
                        Promise.resolve(placeData),
                        Promise.resolve({ lat, lng })
                    ])
                })
                .then(([elevationValue, placeData, coords]) => {
                    if (!abortController.signal.aborted) {
                        // Update position to match the place if we found one
                        if (placeData && coords) {
                            setPosition(prev => {
                                if (prev?.lng === coords.lng && prev?.lat === coords.lat) {
                                    return prev
                                }
                                return { lng: coords.lng, lat: coords.lat }
                            })
                        }
                        setElevation(elevationValue)
                        // If we have a popup but no place found, use the popup label
                        setPlace(placeData ?? (hasPopup ? { name: params.lab } : null))
                        // Check if the place is a saved point based on its type
                        setExistingPoint(placeData?.type === 'point' ? placeData : null)
                    }
                }).catch(() => {
                // Fallback in case Promise.all fails entirely
                if (!abortController.signal.aborted) {
                    setElevation(null)
                    setPlace(null)
                    setExistingPoint(null)
                }
            })
        }, delay)

        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current)
            }
        }
    }, [position, params.lab, hasPopup])

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

        // Remove any existing elevation from the place name (e.g., "Mt Cook (1234m)" -> "Mt Cook")
        const baseNameFromPlace = place?.name?.replace(/\s*\(\d+m\)\s*$/, '') || null

        const placeName = baseNameFromPlace
            ? `${baseNameFromPlace} (${round(elevation || 0, 0)}m)`
            : `${round(position.lat, 6)}, ${round(position.lng, 6)}`

        const point = await db.updatePoint({
            coordinates: [position.lng, position.lat],
            tags: [],
            name: placeName,
            color: "#3b82f6",
        })

        setExistingPoint(place ? { ...place, type: 'point' } : { name: placeName, type: 'point' } as any)
    }

    const handleEditPoint = async () => {
        if (!existingPoint || !position) return

        // Fetch the full point from the database
        const point = await db.findPointByCoordinates(position.lng, position.lat)
        if (point) {
            updateRoute({
                page: `point/${point.id}`,
            })
        }
    }

    const handleRemovePoint = async () => {
        if (!existingPoint || !position) return

        // Fetch the full point from the database
        const point = await db.findPointByCoordinates(position.lng, position.lat)
        if (point) {
            await db.deletePoint(point)
            setExistingPoint(null)
            // Re-fetch the place to find any underlying location (mountain, hut, etc.)
            const underlyingPlace = await findPlace(position.lat, position.lng).catch(() => null)
            setPlace(underlyingPlace)
        }
    }

    const handleClose = () => {
        updateRoute({
            lla: null,
            llo: null,
            lab: null
        })
    }

    const handleShare = async () => {
        const title = place?.name || 'Location'
        await shareLocation(title)
    }

    return hasPopup ? (
        <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
            <div className="bg-white bg-opacity-90 text-black text-xs px-3 py-2 rounded relative">
                <div className="absolute top-1 right-1">
                    <StatusBarButton onClick={handleClose} title="Close" border={false}>
                        ✕
                    </StatusBarButton>
                </div>
                <div className="font-semibold whitespace-nowrap text-center flex items-center justify-center gap-2">
                    {isMountain ? (
                        <button
                            className="text-blue-600 hover:text-blue-800 underline pointer-events-auto"
                            onClick={handlePlaceClick}
                        >
                            {place?.name ?? 'Unknown Point'}
                        </button>
                    ) : (
                        <span>{place?.name ?? 'Unknown Point'}</span>
                    )}
                    <div className="flex gap-1 pointer-events-auto">
                        {isMountain && (
                            <StatusBarButton onClick={handlePlaceClick} title="View routes">
                                🧗 Routes
                            </StatusBarButton>
                        )}
                        {existingPoint && (
                            <StatusBarButton onClick={handleEditPoint} title="Edit point">
                                ✏️
                            </StatusBarButton>
                        )}
                        <StatusBarButton
                            onClick={existingPoint ? handleRemovePoint : handleSavePoint}
                            title={existingPoint ? "Remove saved point" : "Save point"}
                        >
                            {existingPoint ? <span style={{ color: '#fbbf24' }}>★</span> : '☆'}
                        </StatusBarButton>
                        <StatusBarButton onClick={handleShare} title="Share location">
                            🔗
                        </StatusBarButton>
                    </div>
                </div>
            </div>
        </div>
    ) : null
}
