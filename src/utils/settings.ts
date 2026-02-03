import { useEffect, useState } from "react"
import { contourTiles, demOverlaySource } from "../layers/contours"
import linzAerial from "../layers/linzAerial"
import linzVector from "../layers/linzVector"
import topoRaster from "../layers/topoRaster"
import osm from "../layers/osm"
import openTopo from "../layers/openTopo"
import marine from "../layers/marine"

const SETTINGS_LOCAL_STORAGE_KEY = 'topos-settings'

export type CursorMode = 'always' | 'never' | 'automatic'
export type StatusBarMode = 'always' | 'never' | 'interacting'

interface Settings {
    cacheLayers: string[]
    cursorMode: CursorMode
    statusBarMode: StatusBarMode
}

const defaultSettings: Settings = {
    cacheLayers: [linzAerial.id, linzVector.id, topoRaster.id, marine.id, osm.id, openTopo.id, demOverlaySource.id],
    cursorMode: 'automatic',
    statusBarMode: 'always'
}

let cachedValue: Settings | undefined
const getSettings = (): Settings => {
    if (cachedValue) return cachedValue

    const customized = JSON.parse(localStorage.getItem(SETTINGS_LOCAL_STORAGE_KEY) ?? 'null')
    const loaded = {
        ...defaultSettings,
        ...customized,
    } as Settings

    cachedValue = loaded
    return loaded
}

type SettingsListener = (name: keyof Settings) => void
let listeners: SettingsListener[] = []

export const addListener = (callback: SettingsListener) => {
    listeners.push(callback)
}

export const removeListener = (callback: SettingsListener) => {
    const index = listeners.indexOf(callback)
    listeners.splice(index, 1);
}

export const getSetting = <T extends keyof Settings>(key: T) => {
    return getSettings()[key]
}

export const updateSettings = async (update: Partial<Settings>) => {
    const settings = getSettings()
    Object.assign(settings, update)

    for (const key in update) {
        for (const listener of listeners) {
            listener(key as any)
        }
    }

    localStorage.setItem(SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify(settings))
}

export const useSetting = <T extends keyof Settings>(key: T) => {
    const [, setRerender] = useState(0)
    useEffect(() => {
        const listener: SettingsListener = setting => {
            if (setting !== key) return
            setRerender(r => r + 1)
        }
        addListener(listener)

        return () => {
            removeListener(listener)
        }
    }, [key])
    return getSetting(key)
}
