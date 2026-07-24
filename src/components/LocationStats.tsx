import * as React from 'react'
import round from '../utils/round'

export interface LocationStatsProps {
    elevation?: number | null
    slopeAngle?: number | null
    region?: string
    /** StatusBar's compact style: each stat its own "Ele: 123m"-labelled,
     * whitespace-nowrap flex item (gutter spacing comes from the parent's
     * own flex layout there). Otherwise (the location detail page's style):
     * plain unlabelled values, each preceded by " • ", continuing inline
     * after whatever the caller already rendered (e.g. coordinates). */
    labeled?: boolean
    className?: string
}

/**
 * Elevation/slope-angle/region stats shown both in the status bar (tracking
 * the cursor/touch position, see StatusBar.tsx) and the location detail page
 * (a resolved point, see LocationSection.tsx) - kept in one place so a new
 * stat only needs to be added once.
 */
export default function LocationStats({ elevation, slopeAngle, region, labeled = false, className }: LocationStatsProps) {
    const stats: { label: string; value: string }[] = []
    if (elevation != null) stats.push({ label: 'Ele:', value: `${round(elevation, 0)}m` })
    if (slopeAngle != null) stats.push({ label: 'Angl:', value: `${round(slopeAngle, 1)}°` })
    if (region) stats.push({ label: '', value: region })

    if (labeled) {
        return <>
            {stats.map((s, i) => (
                <span key={i} className={className}>
                    {s.label && `${s.label} `}{s.value}
                </span>
            ))}
        </>
    }

    return <>
        {stats.map((s, i) => <React.Fragment key={i}> • {s.value}</React.Fragment>)}
    </>
}
