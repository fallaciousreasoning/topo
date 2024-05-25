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
                ? <a href={`#lla=${p.latlng[0]}&llo=${p.latlng[1]}&lab=${p.text}`} onClick={e => {
                    e.preventDefault()

                    const update: Partial<RouteParams> = {
                        lla: p.latlng![0],
                        llo: p.latlng![1],
                        lab: p.text,
                    }

                    // On mobile, close the mountain view.
                    if (isMobile) {
                        update.page = undefined
                    }
                    updateRoute(update)
                }}>
                    {p.text}
                </a>
                : p.text}
        </React.Fragment>
        ), [isMobile, text])
    return parts
}
