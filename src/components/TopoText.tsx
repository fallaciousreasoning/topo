import { useMemo } from 'react'
import { convertNZMGReferenceToLatLng, convertTopo50ReferenceToLatLng } from '../utils/mapReference'
import React from 'react'
import { RouteParams, useRouteUpdater } from '../routing/router'
import { useIsMobile } from '../hooks/useMediaQuery'
// Match both NZMG (J34) and Topo50 (BW18) formats
const mapRefRegex = /([a-zA-z]{1,2}\d{0,2}\s?\d{2,3}\s?\d{2,3})/gim

export default function TopoText({ text }: { text?: string }) {
    const updateRoute = useRouteUpdater()
    const isMobile = useIsMobile()
    const parts = useMemo(() => (text ?? '')
        .split(mapRefRegex)
        .map(p => ({ latlng: convertTopo50ReferenceToLatLng(p) ?? convertNZMGReferenceToLatLng(p), text: p }))
        .map((p, i) => <React.Fragment key={i}>
            {p.latlng
                ? <a href={`#page=location/${p.latlng[0]}/${p.latlng[1]}/${encodeURIComponent(p.text)}`} onClick={e => {
                    e.preventDefault()

                    updateRoute({
                        page: `location/${p.latlng![0]}/${p.latlng![1]}/${encodeURIComponent(p.text)}`,
                        lat: p.latlng![0],
                        lon: p.latlng![1]
                    })
                }}>
                    {p.text}
                </a>
                : p.text}
        </React.Fragment>
        ), [text])
    return parts
}
