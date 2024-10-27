import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Layer, Source, useMap } from "react-map-gl"
import { range } from "../utils/array"
import { useDrawContext } from "./DrawContext"
import { useLayerHandler } from "../hooks/useLayerClickHandler"
import { useMakeLayerDraggable } from "./useDraggedPoint"
import { getClosestPoint } from "../utils/vector"

const sourceId = 'drawing-source'
const linesId = 'lines-source'
const pointsId = 'points-source'

const useHoverState = (layerIds: string[]) => {
    const map = useMap()
    useEffect(() => {
        const handler = (e: mapboxgl.MapLayerEventType['mousemove']) => {
            if (!e.features || !map.current) return
            if (e.features.length > 0) {
                map.current.removeFeatureState({ source: sourceId })
                const id = e.features[0].id!
                map.current?.setFeatureState({ source: sourceId, id }, { hover: true })
            }
        }

        const leaveHandler = e => {
            map.current?.removeFeatureState({ source: sourceId })
        }

        for (const layerId of layerIds) {
            map.current?.on('mousemove', layerId, handler)
            map.current?.on('mouseleave', layerId, leaveHandler)
        }
        return () => {
            for (const layerId of layerIds) {
                map.current?.off('mousemove', layerId, handler)
                map.current?.off('mouseleave', layerId, leaveHandler)
            }
        }
    }, [])
}

export default function () {
    const map = useMap()
    const draw = useDrawContext()
    const [overrideFeature, setOverrideFeature] = useState<GeoJSON.Feature<GeoJSON.Point>>()
    const [closestPoint, setClosestPoint] = useState<[number, number]>()

    const data = useMemo(() => {
        const coords = [...(draw.track?.coordinates ?? [])]

        // We trust the id here to be the same as our index :fearful:
        if (overrideFeature) {
            coords[overrideFeature.id!] = (overrideFeature.geometry as GeoJSON.Point).coordinates
        }

        const points = coords.map((c, i) => ({
            type: 'Feature',
            properties: {
                class: "point"
            },
            id: i,
            geometry: {
                type: 'Point',
                coordinates: c
            }
        }))

        const lines = range(coords.length - 1).map(i => ({
            id: i + points.length,
            type: 'Feature',
            properties: {
                class: "segment",
                pointIndex: i,
            },
            geometry: {
                type: "LineString",
                coordinates: [
                    coords[i],
                    coords[i + 1]
                ]
            }
        }))

        const additionalPoints = closestPoint
            ? [({
                type: 'Feature',
                properties: {
                    class: "split-point"
                },
                id: points.length + lines.length + 1,
                geometry: {
                    type: 'Point',
                    coordinates: closestPoint
                }
            })]
            : []

        return {
            type: 'FeatureCollection',
            features: [
                ...points,
                ...lines,
                ...additionalPoints
            ]
        } as const
    }, [draw.track, overrideFeature, closestPoint])

    // Clicking a point should cancel the editing
    useLayerHandler('click', `fat-${pointsId}`, e => {
        if (!e.features || !e.features.length) return

        e.preventDefault()
    })

    // Clicking a line should create a new point in the line, rather than at the end
    useLayerHandler('click', `fat-${linesId}`, e => {
        if (!e.features && !e.features.length) return

        e.preventDefault()

        // TODO: Here, we should split the line at the mouse position.
        // I think this would be easier if we added a new feature to the GeoJSON 
        // with id "hoveredPoint" and recorded the index it should be inserted at.
        // hoveredPoint should always be on the closest point on the line being
        // hovered to the mouse cursor.
        draw.updateTrack(t => {
            const update = {
                ...t,
                coordinates: [...t.coordinates]
            }
            return update
        })
    })

    useLayerHandler('mouseover', `fat-${linesId}`, e => {
        const feature = e.features?.[0]
        if (!feature) return

        const start = feature.geometry.coordinates.at(0)
        const end = feature.geometry.coordinates.at(-1)

        const mouse = e.lngLat.toArray() as [number, number]
        const closest = getClosestPoint(start, end, mouse)

        setClosestPoint(closest)
    })

    useEffect(() => {
        const handler = (e: mapboxgl.MapLayerEventType['click']) => {
            if (e.defaultPrevented) return

            const point = e.lngLat.toArray() as [number, number]
            const current = draw.track?.coordinates ?? []
            draw.updateTrack({ coordinates: [...current, point] })
        }
        map.current?.on('click', handler)

        return () => {
            map.current?.off('click', handler)
        }
    }, [map, draw.track])

    // Handler for hiding the closes point for adding a split point on the line
    useEffect(() => {
        const handler = (e: mapboxgl.MapLayerEventType['mouseleave']) => {
            setClosestPoint(undefined)
        }
        map.current?.on('mouseleave', `fat-${linesId}`, handler)

        return () => {
            map.current?.off('mouseleave', `fat-${linesId}`, handler)
        }
    }, [])

    useEffect(() => {
        const handler = (e: mapboxgl.MapLayerEventType['click']) => {
            const feature = e.features?.[0]

            console.log(feature, closestPoint)
            if (!feature) return
            if (!closestPoint) return

            const index = feature.properties!.pointIndex as number
            console.log(index)
            draw.updateTrack(t => {
                const updated = { coordinates: [...t.coordinates] }
                updated.coordinates.splice(index + 1, 0, closestPoint)
                return updated
            })
        }
        map.current?.on('click', `fat-${linesId}`, handler)

        return () => {
            map.current?.off('click', `fat-${linesId}`, handler)
        }
    }, [closestPoint])

    useHoverState([linesId, pointsId].map(i => `fat-${i}`))


    // This probably needs to do something
    useMakeLayerDraggable(`fat-${pointsId}`, feature => {
        if (!feature && overrideFeature) {
            const coord = overrideFeature.geometry.coordinates
            const index = overrideFeature.id as number

            draw.updateTrack(t => {
                const update = {
                    ...t,
                    coordinates: [...t.coordinates]
                }
                update.coordinates[index] = coord as any
                return update
            })
        }
        setOverrideFeature(feature)
    })

    return <Source id={sourceId} type="geojson" data={data}>
        <Layer id={linesId} type="line"
            filter={[
                '==',
                'class',
                'segment'
            ]}
            layout={{
                "visibility": "visible",
                "line-cap": "butt",
                "line-join": "bevel"
            }}
            paint={{
                "line-width": 5,
                "line-color": 'rgb(0, 0, 255)',
                'line-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    0.5
                ]
            }} />
        {/* For hit testing */}
        <Layer id={`fat-${linesId}`} type="line"
            filter={[
                '==',
                'class',
                'segment'
            ]}
            paint={{
                "line-width": 20,
                'line-opacity': 0
            }} />


        <Layer id={pointsId} type="circle"
            layout={{
                visibility: 'visible'
            }}
            filter={[
                '==', 'class', 'point'
            ]}
            paint={{
                "circle-color": 'rgba(0, 0, 255, 1)',
                "circle-stroke-color": "white",
                "circle-stroke-width": 1,
                "circle-radius": 5,
                "circle-opacity": [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    0.5
                ]
            }} />

        {/* For hit testing */}
        <Layer id={`fat-${pointsId}`} type="circle"
            layout={{
                visibility: 'visible'
            }}
            filter={[
                '==', 'class', 'point'
            ]}
            paint={{
                "circle-radius": 10,
                "circle-opacity": 0
            }} />


        <Layer id="split-points" type="circle"
            layout={{
                visibility: 'visible'
            }}
            filter={[
                '==', 'class', 'split-point'
            ]}
            paint={{
                "circle-color": 'rgba(100, 100, 255, 1)',
                "circle-stroke-color": "white",
                "circle-stroke-width": 1,
                "circle-radius": 5,
            }} />
    </Source>
}
