import { Feature, GeoJSONSource, Map } from "maplibre-gl";
import { Track } from "../tracks/track";
import { range } from "../utils/array";
import { getClosestPoint } from "../utils/vector";

type Listener = (drawing: Drawing) => void;

const addHoverState = (map: Map, layerIds: string[]) => {
    for (const layerId of layerIds) {
        map.on('mousemove', layerId, e => {
            if (!e.features || !map) return
            if (e.features.length > 0) {
                map.removeFeatureState({ source: 'drawing-source' })
                const id = e.features[0].id!
                map.setFeatureState({ source: 'drawing-source', id }, { hover: true })
            }
        })

        map.on('mouseleave', layerId, () => {
            map.removeFeatureState({ source: 'drawing-source' })
        })
    }
}

export class Drawing {
    get features(): GeoJSON.FeatureCollection {
        const coords = [...(this.#track?.coordinates ?? [])]
        const points: GeoJSON.Feature[] = coords.map((c, i) => ({
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

        const lines: GeoJSON.Feature[] = range(coords.length - 1).map(i => ({
            id: i + points.length,
            type: 'Feature',
            properties: {
                class: "segment",
                pointIndex: i,
            },
            geometry: {
                type: 'LineString',
                coordinates: [coords[i], coords[i + 1]]
            }
        }))

        const additionalPoints: GeoJSON.Feature[] = this.#closestPoint
            ? [({
                type: 'Feature',
                properties: {
                    class: "split-point"
                },
                id: points.length + lines.length + 1,
                geometry: {
                    type: 'Point',
                    coordinates: this.#closestPoint.coord
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
        }
    }

    #sourceId = 'drawing-source';
    #map: Map;

    // The closest point on the track to the mouse. When the user clicks on the track it will be split at this point.
    #closestPoint: { coord: [number, number], pointIndex: number } | undefined;

    #listeners: Listener[] = [];
    #track: Track = {
        coordinates: []
    };

    #undoStack: Track[] = [];
    #redoStack: Track[] = [];

    get canUndo(): boolean {
        return this.#undoStack.length > 0;
    }

    get canRedo(): boolean {
        return this.#redoStack.length > 0;
    }

    get source(): GeoJSONSource {
        return this.#map.getSource(this.#sourceId) as GeoJSONSource;
    }

    constructor(map: Map, track?: Track) {
        this.#map = map;
        this.#track = track ?? { coordinates: [] }

        this.#map.addSource(this.#sourceId, {
            type: 'geojson',
            data: this.features
        })

        this.addListener(drawing => this.source.setData(drawing.features))

        // Add hover state handlers:
        addHoverState(this.#map, ['hit-test-lines', 'hit-test-points'])

        // Add interaction handlers:
        // When the mouse hovers over a line, we find the closest point on the line and store it:
        this.#map.on('mousemove', 'hit-test-lines', e => {
            const feature = e.features?.[0]
            if (!feature) return

            if (feature.geometry.type !== 'LineString') return

            const start = feature.geometry.coordinates.at(0)!
            const end = feature.geometry.coordinates.at(-1)!

            const mouse = e.lngLat.toArray() as [number, number]
            const closest = getClosestPoint(start as [number, number], end as [number, number], mouse)
            this.#closestPoint = {
                coord: closest,
                pointIndex: feature.properties.pointIndex
            }
            console.log(this.#closestPoint)

            this.notifyListeners()
        })

        // When the mouse leaves the hit-test-lines layer, we clear the closest point:
        this.#map.on('mouseleave', 'hit-test-lines', () => {
            this.#closestPoint = undefined
            this.notifyListeners()
        })

        // When the mouse is over a join, we shouldn't show the split point.
        this.#map.on('mousemove', 'hit-test-points', e => {
            this.#closestPoint = undefined
            this.notifyListeners()
        })

        this.#map.on('click', 'hit-test-lines', e => {
            if (e.defaultPrevented) return
            if (!this.#closestPoint) {
                return
            }

            e.preventDefault()

            console.log(this.#closestPoint)
            const insertAfter = this.#closestPoint.pointIndex
            const clone = [...this.#track.coordinates]
            clone.splice(insertAfter + 1, 0, this.#closestPoint.coord)

            const point = e.lngLat.toArray() as [number, number]
            this.updateTrack(track => ({ coordinates: [...track.coordinates, point] }))
        })

        setTimeout(() => this.initialize(), 1000)
    }

    initialize() {
        // Render the track:
        this.#map.addLayer({
            id: 'lines',
            type: 'line',
            source: this.#sourceId,
            filter: [
                '==',
                'class',
                'segment'
            ],
            layout: {
                "visibility": "visible",
                "line-cap": "butt",
                "line-join": "bevel"
            },
            paint: {
                "line-width": 5,
                "line-color": 'rgb(0, 0, 255)',
                'line-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    0.5
                ]
            }
        })

        this.#map.addLayer({
            id: 'points',
            type: 'circle',
            source: this.#sourceId,
            layout: {
                visibility: 'visible'
            },
            filter: [
                '==', 'class', 'point'
            ],
            paint: {
                "circle-color": 'rgba(0, 0, 255, 1)',
                "circle-stroke-color": "white",
                "circle-stroke-width": 1,
                "circle-radius": 6,
                "circle-opacity": [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    0.5
                ]
            }
        })

        // // Add hit testing layers:
        this.#map.addLayer({
            id: 'hit-test-lines',
            type: 'line',
            source: this.#sourceId,
            filter: [
                '==',
                'class',
                'segment'
            ],
            paint: {
                "line-width": 20,
                'line-opacity': 0
            }
        })

        this.#map.addLayer({
            id: 'hit-test-points',
            type: 'circle',
            source: this.#sourceId,
            layout: {
                visibility: 'visible'
            },
            filter: [
                '==', 'class', 'point'
            ],
            paint: {
                "circle-radius": 10,
                "circle-opacity": 0
            }
        })

        this.#map.addLayer({
            id: "split-points",
            source: this.#sourceId,
            type: "circle",
            layout: {
                visibility: 'visible'
            },
            filter: [
                '==', 'class', 'split-point'
            ],
            paint: {
                "circle-color": 'rgba(100, 100, 255, 1)',
                "circle-stroke-color": "white",
                "circle-stroke-width": 1,
                "circle-radius": 5,
            }
        })
    }

    updateTrack(change: Track | ((track: Track) => Track)) {
        const newValue = typeof change === 'function'
            ? change(this.#track)
            : { ...this.#track, ...change }

        this.#undoStack.push(this.#track)
        this.#track = newValue

        this.notifyListeners()
    }

    undo() {
        if (!this.canUndo) return;

        this.#redoStack.push(this.#track);
        this.#track = this.#undoStack.pop()!;
        this.notifyListeners();
    }

    redo() {
        if (!this.canRedo) return;

        this.#undoStack.push(this.#track);
        this.#track = this.#redoStack.pop()!;
        this.notifyListeners();
    }

    clear() {
        this.#track = { coordinates: [] }
        this.#undoStack = []
        this.#redoStack = []
        this.notifyListeners()
    }

    notifyListeners() {
        for (const listener of this.#listeners) {
            listener(this);
        }
    }

    addListener(listener: Listener) {
        this.#listeners.push(listener);
        return () => this.removeListener(listener);
    }

    removeListener(listener: Listener) {
        this.#listeners = this.#listeners.filter(l => l !== listener);
    }
}
