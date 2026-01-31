import { useMemo } from 'react'
import { convertNZMGReferenceToLatLng } from '../utils/mapReference'
import React from 'react'
import { RouteParams, useRouteUpdater } from '../routing/router'
import { useIsMobile } from '../hooks/useMediaQuery'
const mapRefRegex = /([a-zA-z]\d{0,2}\s?\d{2,3}\s?\d{2,3})/gim

export default function TopoText({ text }: { text?: string }) {
    const updateRoute = useRouteUpdater()
    const isMobile = useIsMobile()
    const parts = useMemo(() => (text ?? '')
        .split(mapRefRegex)
        .map(p => ({ latlng: convertNZMGReferenceToLatLng(p), text: p }))
        .map((p, i) => <React.Fragment key={i}>
            {p.latlng
                ? <a href={`#page=location/${p.latlng[0]}/${p.latlng[1]}/${encodeURIComponent(p.text)}`} onClick={e => {
                    e.preventDefault()

                    updateRoute({
                        page: `location/${p.latlng![0]}/${p.latlng![1]}/${encodeURIComponent(p.text)}`
                    })
                }}>
                    {p.text}
                </a>
                : p.text}
        </React.Fragment>
        ), [text])
    return parts
}
