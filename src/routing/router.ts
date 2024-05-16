import { useEffect, useState } from "react"

interface RouteParams {
    lat: number,
    lon: number,
    zoom: number,
    rotation: number
}

const defaultRouteParams: RouteParams = {
    lat: -43.59557,
    lon: 170.1422,
    zoom: 14,
    rotation: 0
}

const floats: (keyof RouteParams)[] = [
    'lat',
    'lon',
    'zoom',
    'rotation'
]

export const useRoute = (): RouteParams => {
    const [params, setParams] = useState(defaultRouteParams)
    useEffect(() => {
        const reparse = () => {
            // TODO: Parse the hash, update
        }

        window.addEventListener('hashchange', reparse)
        return () => {
            window.removeEventListener('hashchange', reparse)
        }
    })

    return params
}
