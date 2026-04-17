import React, { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Section from './Section'
import Card from '../components/Card'
import Button from '../components/Button'
import db, { Download } from '../caches/indexeddb'
import { cacherPromise } from '../caches/cachingProtocol'
import { NZ_REGIONS, Region } from '../tilebundle/regions'
import { downloadBundle, getBundleUrl } from '../tilebundle/download'

// ─── Per-region row ───────────────────────────────────────────────────────────

interface RegionRowProps {
    region: Region
    layerId: string
    tileExt: string
    url: string
    record: Download | undefined
}

function RegionRow({ region, layerId, tileExt, url, record }: RegionRowProps) {
    const [downloading, setDownloading] = useState(false)
    const [progress, setProgress] = useState(0)

    const handleDownload = useCallback(async () => {
        setDownloading(true)
        setProgress(0)

        const base: Download = {
            ...(record ?? {}),
            regionId: region.id,
            layerId,
            minZoom: region.minZoom,
            maxZoom: region.maxZoom,
            polygon: region.polygon,
            status: 'downloading',
            progress: 0,
            tilesDownloaded: 0,
            error: undefined,
        }
        const saved = await db.updateDownload(base)

        let tilesWritten = 0
        try {
            tilesWritten = await downloadBundle(url, layerId, tileExt, (p) => {
                setProgress(p)
                // Throttle DB writes: update every ~10% of progress
                if (Math.floor(p * 10) > Math.floor(progress * 10)) {
                    db.updateDownload({ ...saved, progress: p, tilesDownloaded: tilesWritten })
                }
            })
            await db.updateDownload({ ...saved, status: 'complete', progress: 1, tilesDownloaded: tilesWritten })
        } catch (err) {
            await db.updateDownload({ ...saved, status: 'error', error: String(err) })
        } finally {
            setDownloading(false)
        }
    }, [region, layerId, tileExt, url, record])

    const handleDelete = useCallback(async () => {
        if (!record) return
        await db.deleteDownload(record)
        const lngs = record.polygon.map(p => p[0])
        const lats = record.polygon.map(p => p[1])
        const cacher = await cacherPromise.then(r => r.default)
        await cacher.deleteTilesInBbox(
            record.layerId,
            Math.min(...lngs), Math.min(...lats),
            Math.max(...lngs), Math.max(...lats),
        )
    }, [record])

    const isComplete = !downloading && record?.status === 'complete'
    const isError = !downloading && record?.status === 'error'
    const displayProgress = downloading ? progress : (record?.progress ?? 0)

    return (
        <div className="flex items-center gap-2 py-1.5 border-b last:border-0">
            <span className="flex-1 text-sm">{region.name}</span>

            {downloading ? (
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
                </div>
            ) : isComplete ? (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 font-medium">Downloaded</span>
                    <button
                        className="text-xs text-gray-400 hover:text-red-500 transition"
                        onClick={handleDelete}
                        title="Remove download record"
                    >
                        ✕
                    </button>
                </div>
            ) : isError ? (
                <Button onClick={handleDownload} title={record?.error}>Retry</Button>
            ) : (
                <Button onClick={handleDownload}>Download</Button>
            )}
        </div>
    )
}

const NZ_REGION = NZ_REGIONS.find(r => r.id === 'nz')!


function polygonBbox(polygon: [number, number][]): [number, number, number, number] {
    const lngs = polygon.map(p => p[0])
    const lats = polygon.map(p => p[1])
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]
}

/** True if bbox A fully contains bbox B */
function bboxContains(
    [aW, aS, aE, aN]: [number, number, number, number],
    [bW, bS, bE, bN]: [number, number, number, number],
) {
    return aW <= bW && aE >= bE && aS <= bS && aN >= bN
}

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

    const islands = NZ_REGIONS.filter(r => r.group === 'island')
    const regions = NZ_REGIONS.filter(r => r.group === 'region')

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
                    tileExt="png"
                    url={getBundleUrl('dem', NZ_REGION.code)}
                    record={elevRecord}
                />
            </Card>

            <h4 className="font-semibold text-base mt-4 mb-1">Topo Maps — New Zealand</h4>
            <Card>
                {islands.map(r => (
                    <RegionRow
                        key={r.id}
                        region={r}
                        layerId="topo-raster"
                        tileExt="png"
                        url={getBundleUrl('topo-raster', r.code)}
                        record={topoRecord(r)}
                    />
                ))}
            </Card>

            <h4 className="font-semibold text-base mt-4 mb-1">Topo Maps — Regions</h4>
            <Card>
                {regions.map(r => (
                    <RegionRow
                        key={r.id}
                        region={r}
                        layerId="topo-raster"
                        tileExt="png"
                        url={getBundleUrl('topo-raster', r.code)}
                        record={topoRecord(r)}
                    />
                ))}
            </Card>
        </Section>
    )
}
