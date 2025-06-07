import React, { useCallback, useEffect, useMemo, useState } from "react"
import { range } from "../utils/array"
import { useDrawContext } from "./DrawContext"
import { useLayerHandler } from "../hooks/useLayerClickHandler"
import { useMakeLayerDraggable } from "./useDraggedPoint"
import { getClosestPoint } from "../utils/vector"
import { MapLayerMouseEvent, MapMouseEvent } from "maplibre-gl"
import { useMap } from "../map/Map"
import Source from "../map/Source"
import Layer from "../map/Layer"
import { useParams } from "../routing/router"
import { Track } from "../tracks/track"
import { Drawing } from "./drawing"

const sourceId = 'drawing-source'
const linesId = 'lines-source'
const pointsId = 'points-source'

const defaultTrack: Track = {
    // coordinates: []
    coordinates: [
        [
            172.72805129610947,
            -43.58415246387667
        ],
        [
            172.68434916280177,
            -43.5761618846112
        ]
    ]
}

const useHoverState = (layerIds: string[]) => {
    const { map } = useMap()

    useEffect(() => {
        const handler = (e: MapLayerMouseEvent) => {
            if (!e.features || !map) return
            if (e.features.length > 0) {
                map.removeFeatureState({ source: sourceId })
                const id = e.features[0].id!
                map.setFeatureState({ source: sourceId, id }, { hover: true })
            }
        }

        const leaveHandler = e => {
            map.removeFeatureState({ source: sourceId })
        }

        for (const layerId of layerIds) {
            map.on('mousemove', layerId, handler)
            map.on('mouseleave', layerId, leaveHandler)
        }
        return () => {
            for (const layerId of layerIds) {
                map.off('mousemove', layerId, handler)
                map.off('mouseleave', layerId, leaveHandler)
            }
        }
    }, [])
}

export default function () {
    const { map } = useMap()
    useMemo(() => new Drawing(map, defaultTrack), [map])
    return <>
    </>
}
