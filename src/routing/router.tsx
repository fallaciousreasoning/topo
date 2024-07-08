import { useContext, useEffect, useState } from "react"
import linzVector from "../layers/linzVector"
import round from "../utils/round"
import * as React from "react"

const localStorageKey = 'map-view-info'

export interface RouteParams {
    lat: number,
    lon: number,
    zoom: number,
    rotation: number,
    pitch: number,
    basemap: string,
    overlays: string[],
    page: string | null,

    // Label
    lla: number | null,
    llo: number | null,
    lab: string | null,
}

const defaultRouteParams: RouteParams = {
    lat: -43.59557,
    lon: 170.1422,
    zoom: 14,
    rotation: 0,
    pitch: 0,
    basemap: linzVector.id,
    overlays: [],
    page: null,
    lla: null,
    llo: null,
    lab: null
}

interface RouterContext {
    params: RouteParams,
    update: (update: Partial<RouteParams>) => void
}

const RouterContext = React.createContext<RouterContext>({
    params: defaultRouteParams,
    update: () => { }
})

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
    pitch: floatParser,
    basemap: stringParser,
    overlays: stringArrayParser,
    page: stringParser,

    lla: floatParser,
    llo: floatParser,
    lab: stringParser,
}

const toTruncated = (dps=6) => (value: number | null) => value !== null ? round(value, dps).toString() : null
const serializers: { [P in keyof RouteParams]: (from: RouteParams[P]) => string | null } = {
    lat: toTruncated(),
    lon: toTruncated(),
    rotation: toTruncated(),
    pitch: toTruncated(4),
    zoom: toTruncated(1),
    basemap: r => r,
    overlays: r => r.join(','),
    page: p => p,
    lla: toTruncated(),
    llo: toTruncated(),
    lab: p => p
}

const parseUrl = (includeStorage = true) => {
    const hash = location.hash
    const parsed = new URLSearchParams(hash.substring(1))
    const fromLocalStorage = includeStorage
        && JSON.parse(localStorage.getItem(localStorageKey)!)

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

const toHash = (routeParams: RouteParams) => {
    const searchParams = new URLSearchParams()

    for (const key in routeParams) {
        const serialized = serializers[key](routeParams[key])
        if (!serialized) continue

        searchParams.set(key, serialized)
    }

    return '#' + searchParams.toString()
        // breaks, with url serialization
        // .replaceAll('%2C', ',')
}

const persistParams = (params: RouteParams) => {
    localStorage.setItem(localStorageKey, JSON.stringify(params))
}

export const Context = (props: React.PropsWithChildren) => {
    const [params, setParams] = useState(parseUrl())
    const update = (partial: Partial<RouteParams>) => {
        const update = {
            ...params,
            ...partial
        }

        persistParams(update)

        const hashed = toHash(update)
        if (hashed == location.hash) return
        window.location.hash = hashed
    }
    useEffect(() => {
        const reparse = () => {
            const params = parseUrl(false)
            setParams(params)
            persistParams(params)
        }

        window.addEventListener('hashchange', reparse)
        return () => {
            window.removeEventListener('hashchange', reparse)
        }
    }, [])
    return <RouterContext.Provider value={{
        params,
        update
    }}>
        {props.children}
    </RouterContext.Provider>
}

export const useParams = () => {
    const { params } = useContext(RouterContext)
    return params
}

export const useRouteUpdater = () => {
    const { update } = useContext(RouterContext)
    const updateRef = React.useRef(update)
    useEffect(() => {
        updateRef.current = update
    }, [update])

    const updater = React.useCallback((u: Partial<RouteParams>) => updateRef?.current(u), [])
    return updater
}
