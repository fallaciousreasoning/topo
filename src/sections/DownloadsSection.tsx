import React, { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Section from './Section'
import Card from '../components/Card'
import Button from '../components/Button'
import db, { Download } from '../caches/indexeddb'
import { cacherPromise } from '../caches/cachingProtocol'
import { NZ_REGIONS, Region } from '../tilebundle/regions'
import { ISLAND_BUNDLE_SIZES } from '../tilebundle/download'
import { polygonBbox, bboxContains } from '../tilebundle/viewport'
import { runDownload, cancelDownload, removeDownload } from '../tilebundle/resume'
import { baseLayers } from '../layers/layerDefinition'
import { friendlyBytes } from '../utils/bytes'
import { usePromise } from '../hooks/usePromise'

// ─── Per-region row ───────────────────────────────────────────────────────────

const HD_MAX_ZOOM = 16
const SD_MAX_ZOOM = 15

interface RegionRowProps {
    region: Region
    layerId: string
    record: Download | undefined
    /** Offer a choice between the full-detail HD bundle and the smaller SD (z15) bundle. */
    offerQuality?: boolean
}

function RegionRow({ region, layerId, record, offerQuality }: RegionRowProps) {
    const handleDownload = useCallback(async (maxZoom: number) => {
        const base: Download = {
            ...(record ?? {}),
            regionId: region.id,
            layerId,
            minZoom: region.minZoom,
            maxZoom,
            polygon: region.polygon,
            status: 'downloading',
            progress: 0,
            tilesDownloaded: 0,
            error: undefined,
        }
        const saved = await db.updateDownload(base)
        await runDownload(saved)
    }, [region, layerId, record])

    const handleDelete = useCallback(async () => {
        if (!record) return
        await removeDownload(record)
    }, [record])

    const isDownloading = record?.status === 'downloading'
    const isComplete = record?.status === 'complete'
    const isError = record?.status === 'error'
    const displayProgress = record?.progress ?? 0
    const qualityLabel = offerQuality && record?.maxZoom != null
        ? (record.maxZoom <= SD_MAX_ZOOM ? 'SD' : 'HD')
        : null
    const bundleSize = offerQuality ? ISLAND_BUNDLE_SIZES[region.id] : undefined

    const { result: sizeBytes } = usePromise(async () => {
        if (!isComplete) return undefined
        const [west, south, east, north] = polygonBbox(region.polygon)
        const cacher = await cacherPromise.then(r => r.default)
        return cacher.getSizeInBbox(layerId, west, south, east, north)
    }, [isComplete, layerId, region.polygon])

    return (
        <div className="flex items-center gap-2 py-1.5 border-b last:border-0">
            <span className="flex-1 text-sm">{region.name}</span>

            {isDownloading ? (
                <div className="flex items-center gap-2 w-32 h-8">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-purple-600 transition-all duration-300"
                            style={{ width: `${Math.round(displayProgress * 100)}%` }}
                        />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">
                        {Math.round(displayProgress * 100)}%
                    </span>
                    <button
                        className="text-xs text-gray-400 hover:text-red-500 transition"
                        onClick={() => cancelDownload(record!.id!)}
                        title="Cancel download"
                    >
                        ✕
                    </button>
                </div>
            ) : isComplete ? (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 font-medium">
                        Downloaded{qualityLabel ? ` (${qualityLabel})` : ''}{sizeBytes != null ? ` · ${friendlyBytes(sizeBytes)}` : ''}
                    </span>
                    {qualityLabel === 'SD' && (
                        <Button onClick={() => handleDownload(HD_MAX_ZOOM)}>
                            HD{bundleSize ? ` (${friendlyBytes(bundleSize.hd)})` : ''}
                        </Button>
                    )}
                    <button
                        className="text-xs text-gray-400 hover:text-red-500 transition"
                        onClick={handleDelete}
                        title="Remove download record"
                    >
                        ✕
                    </button>
                </div>
            ) : offerQuality ? (
                <div className="flex items-center gap-1">
                    {isError && <span className="text-xs text-red-500" title={record?.error}>⚠</span>}
                    <Button onClick={() => handleDownload(HD_MAX_ZOOM)}>
                        HD{bundleSize ? ` (${friendlyBytes(bundleSize.hd)})` : ''}
                    </Button>
                    <Button onClick={() => handleDownload(SD_MAX_ZOOM)}>
                        SD{bundleSize ? ` (${friendlyBytes(bundleSize.sd)})` : ''}
                    </Button>
                </div>
            ) : isError ? (
                <Button onClick={() => handleDownload(region.maxZoom)} title={record?.error}>Retry</Button>
            ) : (
                <Button onClick={() => handleDownload(region.maxZoom)}>Download</Button>
            )}
        </div>
    )
}

// ─── Custom (map-drawn) viewport row ───────────────────────────────────────────

function CustomAreaRow({ download }: { download: Download }) {
    const layerName = baseLayers.find(l => l.id === download.layerId)?.name ?? download.layerId
    const label = download.name ?? layerName

    const handleRetry = useCallback(async () => {
        await runDownload(download)
    }, [download])

    const handleDelete = useCallback(async () => {
        await removeDownload(download)
    }, [download])

    const isDownloading = download.status === 'downloading'
    const isComplete = download.status === 'complete'
    const isError = download.status === 'error'

    const { result: sizeBytes } = usePromise(async () => {
        if (!isComplete) return undefined
        const [west, south, east, north] = polygonBbox(download.polygon)
        const cacher = await cacherPromise.then(r => r.default)
        return cacher.getSizeInBbox(download.layerId, west, south, east, north)
    }, [isComplete, download.layerId, download.polygon])

    return (
        <div className="flex items-center gap-2 py-1.5 border-b last:border-0">
            <span className="flex-1 text-sm">
                {label}
                <span className="block text-xs text-gray-500">{layerName} · z{download.minZoom}–{download.maxZoom}</span>
            </span>

            {isDownloading ? (
                <div className="flex items-center gap-2 w-32 h-8">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-purple-600 transition-all duration-300"
                            style={{ width: `${Math.round(download.progress * 100)}%` }}
                        />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">
                        {Math.round(download.progress * 100)}%
                    </span>
                    <button
                        className="text-xs text-gray-400 hover:text-red-500 transition"
                        onClick={() => cancelDownload(download.id!)}
                        title="Cancel download"
                    >
                        ✕
                    </button>
                </div>
            ) : isComplete ? (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 font-medium">
                        Downloaded{sizeBytes != null ? ` · ${friendlyBytes(sizeBytes)}` : ''}
                    </span>
                    <button
                        className="text-xs text-gray-400 hover:text-red-500 transition"
                        onClick={handleDelete}
                        title="Remove download record"
                    >
                        ✕
                    </button>
                </div>
            ) : isError ? (
                <Button onClick={handleRetry} title={download.error}>Retry</Button>
            ) : null}
        </div>
    )
}

const NZ_REGION = NZ_REGIONS.find(r => r.id === 'nz')!

// ─── Section ─────────────────────────────────────────────────────────────────

export default function DownloadsSection() {
    const downloads = useLiveQuery(() => db.getDownloads(), []) ?? []

    const complete = downloads.filter(d => d.status === 'complete')

    /** Find the download record for this region+layer, or a containing download that covers it. */
    function recordFor(polygon: [number, number][], layerId: string): Download | undefined {
        const bbox = polygonBbox(polygon)
        return downloads.find(d => d.layerId === layerId && d.regionId === NZ_REGIONS.find(r =>
            r.polygon === polygon)?.id)
            ?? complete.find(d => d.layerId === layerId && bboxContains(polygonBbox(d.polygon), bbox))
    }

    const topoRecord  = (region: { id: string; polygon: [number, number][] }) =>
        recordFor(region.polygon, 'topo-raster')
    const elevRecord  = recordFor(NZ_REGION.polygon, 'dem')

    const islands = NZ_REGIONS.filter(r => r.group === 'island' && r.id !== 'nz')
    const customAreas = downloads.filter(d => d.regionId === null)

    return (
        <Section page="downloads" closable exact title="Downloads">
            <p className="text-sm text-gray-500 italic mt-1 mb-3">
                Download map tiles for offline use. Tiles are stored on your device and
                available without a connection.
            </p>

            <h4 className="font-semibold text-base mb-1">Elevation Data</h4>
            <Card>
                <RegionRow
                    region={NZ_REGION}
                    layerId="dem"
                    record={elevRecord}
                />
            </Card>

            <h4 className="font-semibold text-base mt-4 mb-1">Topo Maps — Islands</h4>
            <Card>
                {islands.map(r => (
                    <RegionRow
                        key={r.id}
                        region={r}
                        layerId="topo-raster"
                        record={topoRecord(r)}
                        offerQuality
                    />
                ))}
            </Card>

            {customAreas.length > 0 && (
                <>
                    <h4 className="font-semibold text-base mt-4 mb-1">Custom Areas</h4>
                    <Card>
                        {customAreas.map(d => (
                            <CustomAreaRow key={d.id} download={d} />
                        ))}
                    </Card>
                </>
            )}
        </Section>
    )
}
