import React from "react";
import Section from "./Section";
import Checkbox from "../components/Checkbox";
import { friendlyBytes } from "../utils/bytes";
import { baseLayers, overlays } from "../layers/layerDefinition";
import Card from "../components/Card";
import { updateSettings, useSetting, type CursorMode, type StatusBarMode } from "../utils/settings";
import { usePromise } from "../hooks/usePromise";
import { cacherPromise } from "../caches/cachingProtocol";
import { demOverlaySource } from "../layers/contours";
import Button from "../components/Button";

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

    return <Section page="settings" exact closable title="Settings">
        <div>
            <h4 className="mt-2 font-semibold text-base">Layers</h4>
            <div className="flex flex-col gap-2 my-1">
                {cacheableLayers.map(layer => <Card key={layer.id}>
                    <h5 className="font-semibold">{layer.name}</h5>
                    <div className="text-gray-500 italic">{layer.description}</div>
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

            <h4 className="mt-4 font-semibold text-base">Cursor & Distance Line</h4>
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
                    {(['always', 'pinned'] as StatusBarMode[]).map(mode => (
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
                            {mode === 'pinned' && <span className="text-gray-500 text-sm">(only when long-press location is pinned)</span>}
                        </label>
                    ))}
                </div>
            </Card>
        </div>
    </Section>
}
