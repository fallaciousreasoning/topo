import React, { useRef } from "react";
import Section from "./Section";
import Checkbox from "../components/Checkbox";
import { friendlyBytes } from "../utils/bytes";
import { baseLayers, overlays } from "../layers/layerDefinition";
import Card from "../components/Card";
import { updateLayerSetting, updateSettings, useLayerSetting, useSetting, type CursorMode, type StatusBarMode } from "../utils/settings";
import { usePromise } from "../hooks/usePromise";
import { cacherPromise } from "../caches/cachingProtocol";
import { demOverlaySource } from "../layers/contours";
import Button from "../components/Button";
import { LayerSettingDescriptor } from "../layers/config";
import { importGPXFile } from "../utils/importGPX";
import { exportGPX, downloadGPX } from "../utils/exportGPX";
import db from "../caches/indexeddb";

function LayerSettingControl({ layerId, settingKey, descriptor }: { layerId: string, settingKey: string, descriptor: LayerSettingDescriptor }) {
    const value = useLayerSetting(layerId, settingKey, descriptor.default)
    return (
        <>
            <hr className="my-2" />
            <div className="text-xs">
                <div className="flex justify-between items-center">
                    <label className="font-medium">{descriptor.label}</label>
                    <span className="text-gray-500">{Math.round(value * 100)}%</span>
                </div>
                {descriptor.description && <div className="text-gray-500 italic mb-1">{descriptor.description}</div>}
                <input
                    type="range"
                    min={descriptor.min}
                    max={descriptor.max}
                    step={descriptor.step}
                    value={value}
                    onChange={e => updateLayerSetting(layerId, settingKey, parseFloat(e.target.value))}
                    className="w-full"
                />
            </div>
            <hr className="my-2" />
        </>
    )
}

const cacheableLayers = [
    ...baseLayers,
    demOverlaySource,
    ...overlays,
].filter(c => c.cacheable)

export default function SettingsSection() {
    const cacheLayers = useSetting('cacheLayers')
    const cursorMode = useSetting('cursorMode')
    const statusBarMode = useSetting('statusBarMode')
    const { result: sizes = {} } = usePromise(() => cacherPromise.then(c => c.default.getLayerSizes()), [])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const result = await importGPXFile(file)
            for (const track of result.tracks) await db.updateTrack(track)
            for (const point of result.points) await db.updatePoint(point)
            if (fileInputRef.current) fileInputRef.current.value = ''
            const parts = []
            if (result.tracks.length > 0) parts.push(`${result.tracks.length} track(s)`)
            if (result.points.length > 0) parts.push(`${result.points.length} point(s)`)
            alert(`Successfully imported ${parts.join(' and ')}`)
        } catch (error) {
            alert(`Failed to import GPX: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    const handleExport = async () => {
        const [tracks, points] = await Promise.all([db.getTracks(), db.getPoints()])
        if (tracks.length === 0 && points.length === 0) {
            alert('No tracks or points to export.')
            return
        }
        downloadGPX(exportGPX(tracks, points))
    }

    return <Section page="settings" exact closable title="Settings">
        <div>
            <h4 className="mt-2 font-semibold text-base">Cursor & Distance Line</h4>
            <Card>
                <h5 className="font-semibold">Display Mode</h5>
                <div className="text-gray-500 italic mb-2">Controls when the center crosshair and distance line to your location are shown</div>
                <div className="flex flex-col gap-2">
                    {(['always', 'automatic', 'never'] as CursorMode[]).map(mode => (
                        <label key={mode} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="cursorMode"
                                value={mode}
                                checked={cursorMode === mode}
                                onChange={() => updateSettings({ cursorMode: mode })}
                                className="w-4 h-4"
                            />
                            <span className="capitalize">{mode}</span>
                            {mode === 'automatic' && <span className="text-gray-500 text-sm">(show when interacting with map)</span>}
                        </label>
                    ))}
                </div>
            </Card>

            <h4 className="mt-4 font-semibold text-base">Status Bar</h4>
            <Card>
                <h5 className="font-semibold">Display Mode</h5>
                <div className="text-gray-500 italic mb-2">Controls when the status bar at the bottom of the map is shown</div>
                <div className="flex flex-col gap-2">
                    {(['always', 'interacting', 'never'] as StatusBarMode[]).map(mode => (
                        <label key={mode} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="statusBarMode"
                                value={mode}
                                checked={statusBarMode === mode}
                                onChange={() => updateSettings({ statusBarMode: mode })}
                                className="w-4 h-4"
                            />
                            <span className="capitalize">{mode}</span>
                            {mode === 'interacting' && <span className="text-gray-500 text-sm">(show when interacting with map)</span>}
                        </label>
                    ))}
                </div>
            </Card>

            <h4 className="mt-4 font-semibold text-base">Tracks & Points</h4>
            <div className="flex flex-col gap-2">
                <Button onClick={() => fileInputRef.current?.click()}>Import GPX</Button>
                <Button onClick={handleExport}>Export GPX</Button>
                <input ref={fileInputRef} type="file" accept=".gpx" onChange={handleImport} style={{ display: 'none' }} />
            </div>

            <h4 className="mt-4 font-semibold text-base">Layers</h4>
            <div className="flex flex-col gap-2 my-1">
                {cacheableLayers.map(layer => <Card key={layer.id}>
                    <h5 className="font-semibold">{layer.name}</h5>
                    <div className="text-gray-500 italic">{layer.description}</div>
                    {layer.settings && Object.entries(layer.settings).map(([key, descriptor]) => (
                        <LayerSettingControl key={key} layerId={layer.id} settingKey={key} descriptor={descriptor} />
                    ))}
                    <Checkbox
                        checked={cacheLayers.includes(layer.id)}
                        onChange={(checked) => {
                            const newLayers = checked ? [...cacheLayers, layer.id] : cacheLayers.filter(c => c !== layer.id)
                            updateSettings({ cacheLayers: newLayers })
                        }}>
                        Cache viewed tiles
                    </Checkbox>
                    <div>
                        Currently using {friendlyBytes(sizes[layer.id] ?? 0)} of storage.
                    </div>
                    {!!sizes[layer.id] && <Button
                        onClick={() => {
                            if (
                                window.confirm(
                                    `Are you sure you want to delete the tiles for ${layer.name}? They will not be available offline.`
                                )
                            ) {
                                cacherPromise.then(c => c.default.clearLayer(layer.id))
                            }
                        }}>
                        Delete Tiles
                    </Button>}
                </Card>)}
            </div>
        </div>
    </Section>
}
