import { useMemo } from 'react'
import { convertNZMGReferenceToLatLng, convertTopo50ReferenceToLatLng } from '../utils/mapReference'
import React from 'react'
import { useRouteUpdater } from '../routing/router'
import { useIsMobile } from '../hooks/useMediaQuery'
import { Hut } from '../layers/huts'

// Match both NZMG (J34) and Topo50 (BW18) formats
const mapRefRegex = /([a-zA-z]{1,2}\d{0,2}\s?\d{2,3}\s?\d{2,3})/gim

export default function TopoText({ text, huts }: { text?: string, huts?: Hut[] }) {
    const updateRoute = useRouteUpdater()
    const isMobile = useIsMobile()

    const { hutRegex, hutByLower } = useMemo(() => {
        if (!huts?.length) return { hutRegex: null, hutByLower: null }
        const sorted = [...huts].sort((a, b) => b.name.length - a.name.length)
        const escaped = sorted.map(h => h.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        return {
            hutRegex: new RegExp(`(${escaped.join('|')})`, 'gi'),
            hutByLower: new Map(huts.map(h => [h.name.toLowerCase(), h])),
        }
    }, [huts])

    const parts = useMemo<React.ReactNode[]>(() => {
        const rawText = text ?? ''
        const result: React.ReactNode[] = []
        let key = 0

        for (const part of rawText.split(mapRefRegex)) {
            const latlng = convertTopo50ReferenceToLatLng(part) ?? convertNZMGReferenceToLatLng(part)
            if (latlng) {
                result.push(
                    <a key={key++} href={`#page=location/${latlng[0]}/${latlng[1]}/${encodeURIComponent(part)}`} onClick={e => {
                        e.preventDefault()
                        updateRoute({ page: `location/${latlng[0]}/${latlng[1]}/${encodeURIComponent(part)}`, lat: latlng[0], lon: latlng[1] })
                    }}>
                        {part}
                    </a>
                )
                continue
            }

            if (!hutRegex || !hutByLower) {
                result.push(<React.Fragment key={key++}>{part}</React.Fragment>)
                continue
            }

            for (const seg of part.split(hutRegex)) {
                const hut = hutByLower.get(seg.toLowerCase())
                if (hut) {
                    const lat = parseFloat(hut.lat as any)
                    const lon = parseFloat(hut.lon as any)
                    result.push(
                        <a key={key++} href={`#page=location/${lat}/${lon}/${encodeURIComponent(seg)}`} onClick={e => {
                            e.preventDefault()
                            updateRoute({ page: `location/${lat}/${lon}/${encodeURIComponent(seg)}`, lat, lon })
                        }}>
                            {seg}
                        </a>
                    )
                } else {
                    result.push(<React.Fragment key={key++}>{seg}</React.Fragment>)
                }
            }
        }

        return result
    }, [text, hutRegex, hutByLower])

    return <>{parts}</>
}
