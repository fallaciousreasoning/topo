import React from 'react'
import { Track } from '../tracks/track'
import { getElevation } from '../layers/contours'
import { buildFullCoordinates, generateSamplePoints } from '../tracks/trackUtils'
import { friendlyDistance } from '../utils/friendlyUnits'

const ELEVATION_ZOOM_LEVEL = 12
const W = 560, H = 150
const PAD = { top: 8, right: 8, bottom: 26, left: 44 }
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

let chartCounter = 0

export function useElevationData(track: Track) {
    const [elevations, setElevations] = React.useState<{ distance: number; elevation: number }[]>([])
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
        if (track.coordinates.length < 2) { setElevations([]); return }
        let cancelled = false
        setLoading(true)
        const run = async () => {
            const samplePoints = generateSamplePoints(buildFullCoordinates(track))
            const points: { distance: number; elevation: number }[] = []
            for (const sp of samplePoints) {
                if (cancelled) return
                try {
                    const ele = await getElevation([sp.coord[1], sp.coord[0]], ELEVATION_ZOOM_LEVEL)
                    points.push({ distance: sp.distance, elevation: ele })
                } catch {
                    points.push({ distance: sp.distance, elevation: 0 })
                }
            }
            if (!cancelled) { setElevations(points); setLoading(false) }
        }
        run()
        return () => { cancelled = true }
    }, [track.coordinates, track.routedSegments])

    return { elevations, loading }
}

function interpolate(elevations: { distance: number; elevation: number }[], targetDist: number): number {
    if (targetDist <= elevations[0].distance) return elevations[0].elevation
    for (let i = 0; i < elevations.length - 1; i++) {
        const a = elevations[i], b = elevations[i + 1]
        if (targetDist <= b.distance) {
            const t = (targetDist - a.distance) / (b.distance - a.distance)
            return a.elevation + t * (b.elevation - a.elevation)
        }
    }
    return elevations[elevations.length - 1].elevation
}

export default function ElevationChart({ track }: { track: Track }) {
    const { elevations, loading } = useElevationData(track)
    const [hover, setHover] = React.useState<{ xPx: number; dist: number; ele: number } | null>(null)
    const gradId = React.useRef(`ele-grad-${chartCounter++}`).current

    if (track.coordinates.length < 2) return null

    if (loading && elevations.length === 0) {
        return <div className="h-24 flex items-center justify-center text-xs text-gray-400">Loading elevation…</div>
    }

    if (elevations.length < 2) return null

    const maxDist = elevations[elevations.length - 1].distance
    const minEle = Math.min(...elevations.map(p => p.elevation))
    const maxEle = Math.max(...elevations.map(p => p.elevation))
    const eleRange = maxEle - minEle || 1

    const toX = (dist: number) => PAD.left + (dist / maxDist) * CW
    const toY = (ele: number) => PAD.top + (1 - (ele - minEle) / eleRange) * CH

    const areaPath =
        `M${toX(0)},${toY(minEle)} ` +
        elevations.map(p => `L${toX(p.distance).toFixed(1)},${toY(p.elevation).toFixed(1)}`).join(' ') +
        ` L${toX(maxDist)},${toY(minEle)} Z`
    const linePath = elevations.map((p, i) =>
        `${i === 0 ? 'M' : 'L'}${toX(p.distance).toFixed(1)},${toY(p.elevation).toFixed(1)}`
    ).join(' ')

    const Y_TICKS = 4, X_TICKS = 4

    const updateHoverFromClientX = (el: SVGSVGElement, clientX: number) => {
        const rect = el.getBoundingClientRect()
        const svgX = (clientX - rect.left) * (W / rect.width)
        const chartX = svgX - PAD.left
        if (chartX < 0 || chartX > CW) { setHover(null); return }
        const dist = (chartX / CW) * maxDist
        setHover({ xPx: svgX, dist, ele: interpolate(elevations, dist) })
    }

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) =>
        updateHoverFromClientX(e.currentTarget, e.clientX)

    const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
        e.preventDefault()
        updateHoverFromClientX(e.currentTarget, e.touches[0].clientX)
    }

    let totalUp = 0, totalDown = 0
    for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i].elevation - elevations[i - 1].elevation
        if (diff > 0) totalUp += diff; else totalDown += Math.abs(diff)
    }

    return (
        <div className="relative select-none">
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full"
                style={{ height: '110px' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHover(null)}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => setHover(null)}
                onTouchCancel={() => setHover(null)}
            >
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.03" />
                    </linearGradient>
                </defs>

                {/* Grid */}
                {Array.from({ length: Y_TICKS + 1 }, (_, i) => {
                    const y = PAD.top + (i / Y_TICKS) * CH
                    const ele = maxEle - (i / Y_TICKS) * eleRange
                    return (
                        <g key={i}>
                            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                            <text x={PAD.left - 5} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9ca3af">
                                {Math.round(ele)}m
                            </text>
                        </g>
                    )
                })}
                {Array.from({ length: X_TICKS + 1 }, (_, i) => {
                    const x = PAD.left + (i / X_TICKS) * CW
                    const dist = (i / X_TICKS) * maxDist
                    return (
                        <g key={i}>
                            <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + CH} stroke="#f3f4f6" strokeWidth="1" />
                            <text x={x} y={H - 5} textAnchor="middle" fontSize="9" fill="#9ca3af">
                                {dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`}
                            </text>
                        </g>
                    )
                })}

                {/* Fill + line */}
                <path d={areaPath} fill={`url(#${gradId})`} />
                <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />

                {/* Hover crosshair */}
                {hover && (
                    <>
                        <line
                            x1={hover.xPx} y1={PAD.top}
                            x2={hover.xPx} y2={PAD.top + CH}
                            stroke="#6b7280" strokeWidth="1" strokeDasharray="3,2"
                        />
                        <circle
                            cx={hover.xPx} cy={toY(hover.ele)}
                            r="3" fill="#3b82f6" stroke="white" strokeWidth="1.5"
                        />
                    </>
                )}
            </svg>

            {/* Hover tooltip */}
            {hover && (
                <div
                    className="absolute top-0 pointer-events-none text-xs bg-gray-800 text-white rounded px-2 py-0.5 shadow-md whitespace-nowrap"
                    style={{
                        left: `${(hover.xPx / W) * 100}%`,
                        transform: hover.xPx > W * 0.6 ? 'translateX(calc(-100% - 4px))' : 'translateX(4px)',
                        top: '4px',
                    }}
                >
                    {friendlyDistance(hover.dist)} · {Math.round(hover.ele)}m
                </div>
            )}

            {/* Stats row */}
            <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                <span>{friendlyDistance(maxDist)}</span>
                <span>↗ {Math.round(totalUp)}m</span>
                <span>↘ {Math.round(totalDown)}m</span>
                <span>{Math.round(minEle)}–{Math.round(maxEle)}m ele</span>
            </div>
        </div>
    )
}
