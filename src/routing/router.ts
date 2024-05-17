import { useEffect, useState } from "react"
import linzVector from "../layers/linzVector"

const localStorageKey = 'map-view-info'

interface RouteParams {
    lat: number,
    lon: number,
    zoom: number,
    rotation: number,
    basemap: string,
    overlays: string[]
}

const defaultRouteParams: RouteParams = {
    lat: -43.59557,
    lon: 170.1422,
    zoom: 14,
    rotation: 0,
    basemap: linzVector.id,
    overlays: []
}

const floatParser = (from: string) => {
    const r = parseFloat(from)
    return isNaN(r) ? null : r
}

const stringArrayParser = (from?: string) => {
    return from?.split(',') ?? null
}

const stringParser = (from: string) => from

const parsers: { [P in keyof RouteParams]: (fromParams: string) => RouteParams[P] | null } = {
    lat: floatParser,
    lon: floatParser,
    zoom: floatParser,
    rotation: floatParser,
    basemap: stringParser,
    overlays: stringArrayParser
}

const parseUrl = () => {
    const hash = location.hash
    const parsed = new URLSearchParams(hash)
    const fromLocalStorage = JSON.parse(localStorage.getItem(localStorageKey)!)

    const result: RouteParams = {} as any

    for (const key in parsers) {
        const parser = parsers[key]
        const urlValue = parser(parsed.get(key));

        if (urlValue) {
            result[key] = urlValue
            continue;
        }

        if (fromLocalStorage) {
            result[key] = fromLocalStorage[key];
            continue;
        }

        result[key] = defaultRouteParams[key]
    }

    return result
}

const persistParams = (params: RouteParams) => {
    localStorage.setItem(localStorageKey, JSON.stringify(params))
}

export const useRoute = (): RouteParams => {
    const [params, setParams] = useState(defaultRouteParams)
    useEffect(() => {
        const reparse = () => {
            const params = parseUrl()

            setParams(params)
            persistParams(params)
        }

        reparse()

        window.addEventListener('hashchange', reparse)
        return () => {
            window.removeEventListener('hashchange', reparse)
        }
    }, [])

    return params
}
