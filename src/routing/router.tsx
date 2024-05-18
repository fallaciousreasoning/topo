import { useContext, useEffect, useState } from "react"
import linzVector from "../layers/linzVector"
import round from "../utils/round"
import * as React from "react"

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
    basemap: stringParser,
    overlays: stringArrayParser
}

const toTruncated = (value: number) => round(value, 5).toString()
const serializers: { [P in keyof RouteParams]: (from: RouteParams[P]) => string | null } = {
    lat: toTruncated,
    lon: toTruncated,
    rotation: toTruncated,
    zoom: toTruncated,
    basemap: r => r,
    overlays: r => r.join(',')
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

const toHash = (routeParams: RouteParams) => {
    const searchParams = new URLSearchParams()

    for (const key in routeParams) {
        const serialized = serializers[key](routeParams[key])
        if (!serialized) continue

        searchParams.set(key, serialized)
    }

    return searchParams.toString().replaceAll('%2C', ',')
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
        localStorage.setItem(localStorageKey, JSON.stringify(update))
        window.location.hash = toHash(update)
    }
    useEffect(() => {
        const reparse = () => {
            const params = parseUrl()

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
    return update
}
