import * as React from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Control from './Control'
import { useMap } from '../map/Map'
import { useParams } from '../routing/router'
import { baseLayers } from '../layers/layerDefinition'
import linzVector from '../layers/linzVector'
import db, { Download } from '../caches/indexeddb'
import { estimateTileCount, estimateDownloadBytes, getMaxDownloadZoom, polygonBbox, bboxContains } from '../tilebundle/viewport'
import { runDownload, cancelDownload } from '../tilebundle/resume'
import { friendlyBytes } from '../utils/bytes'
import ProgressCircle from '../components/ProgressCircle'

const MIN_ZOOM = 10

export default function DownloadAreaControl() {
    const { map } = useMap()
    const routeParams = useParams()
    const [zoom, setZoom] = React.useState(map.getZoom())
    const [bounds, setBounds] = React.useState(map.getBounds())
    const [downloadingId, setDownloadingId] = React.useState<number | null>(null)
    const [progress, setProgress] = React.useState(0)
    const downloading = downloadingId != null
    const downloads = useLiveQuery(() => db.getDownloads(), []) ?? []

    React.useEffect(() => {
        // 'move' also fires for zoom/rotate changes, so one listener covers both
        const onMove = () => {
            setZoom(map.getZoom())
            setBounds(map.getBounds())
        }
        map.on('move', onMove)
        return () => {
            map.off('move', onMove)
        }
    }, [map])

    if (zoom < MIN_ZOOM) return null

    const basemap = baseLayers.find(l => l.id === routeParams.basemap) ?? linzVector

    const bbox: [number, number, number, number] = [
        bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth(),
    ]
    const minZoom = Math.max(MIN_ZOOM, Math.floor(zoom))
    const maxZoom = getMaxDownloadZoom(basemap.id)

    const alreadyDownloaded = downloads.some(d =>
        d.status === 'complete' &&
        d.layerId === basemap.id &&
        d.minZoom <= minZoom &&
        d.maxZoom >= maxZoom &&
        bboxContains(polygonBbox(d.polygon), bbox)
    )

    const handleClick = async () => {
        if (downloadingId != null) {
            cancelDownload(downloadingId)
            return
        }

        if (alreadyDownloaded) {
            window.alert('This area is already downloaded')
            return
        }

        const polygon: [number, number][] = [
            [bbox[0], bbox[1]], [bbox[2], bbox[1]], [bbox[2], bbox[3]], [bbox[0], bbox[3]], [bbox[0], bbox[1]],
        ]

        const tileCount = estimateTileCount(bbox, minZoom, maxZoom)
        const estimatedBytes = estimateDownloadBytes(basemap.id, tileCount)
        const name = window.prompt(
            `Download ${tileCount} tiles (~${friendlyBytes(estimatedBytes)}) of ${basemap.name} for offline use?\n\nName this area:`,
            `${basemap.name} area`
        )
        if (name === null) return

        setProgress(0)

        const base: Download = {
            regionId: null,
            name: name.trim() || `${basemap.name} area`,
            layerId: basemap.id,
            minZoom,
            maxZoom,
            polygon,
            status: 'downloading',
            progress: 0,
            tilesDownloaded: 0,
        }
        const saved = await db.updateDownload(base)
        setDownloadingId(saved.id!)

        try {
            await runDownload(saved, setProgress)
        } finally {
            setDownloadingId(null)
        }
    }

    return <Control position='top-left'>
        <button
            type='button'
            title={downloading ? 'Cancel download' : alreadyDownloaded ? 'This area is already downloaded' : 'Download this area for offline use'}
            onClick={handleClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...(alreadyDownloaded ? { backgroundColor: '#16a34a', color: 'white', borderRadius: '4px' } : {}),
            }}
        >
            {downloading ? <ProgressCircle progress={progress} /> : alreadyDownloaded ? '✓' : '⬇️'}
        </button>
    </Control>
}
