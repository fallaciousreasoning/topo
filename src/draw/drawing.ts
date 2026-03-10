import {
  GeoJSONFeature,
  GeoJSONSource,
  LngLat,
  Map,
  MapGeoJSONFeature,
  MapMouseEvent,
  MapTouchEvent,
  Subscription,
  LngLatBounds,
} from "maplibre-gl";
import { Track } from "../tracks/track";
import { range } from "../utils/array";
import { getClosestPoint } from "../utils/vector";
import { RoutingManager } from "./routingManager";

type Listener = (drawing: Drawing) => void;

function segKey(a: [number, number], b: [number, number]): string {
  return `${a[0]},${a[1]}:${b[0]},${b[1]}`;
}

const addHoverState = (map: Map, layerIds: string[]) => {
  for (const layerId of layerIds) {
    map.on("mousemove", layerId, (e) => {
      if (!e.features || !map) return;
      if (e.features.length > 0) {
        map.removeFeatureState({ source: "drawing-source" });
        const id = e.features[0].id!;
        map.setFeatureState({ source: "drawing-source", id }, { hover: true });
      }
    });

    map.on("mouseleave", layerId, () => {
      map.removeFeatureState({ source: "drawing-source" });
    });
  }
};

const createDragger = (
  map: Map,
  e: {
    lngLat: LngLat;
    features?: MapGeoJSONFeature[];
  },
  drawing: Drawing,
  onFinish?: (coord: [number, number]) => void,
) => {
  const feature = e.features?.[0];
  if (feature?.geometry.type !== "Point") return;

  if (drawing.hasDragger) return;
  drawing.hasDragger = true;
  drawing.clearClosestPoint();

  const pointIndex = feature.properties.pointIndex;
  const center = feature.geometry.coordinates as [number, number];
  const clickedAt = e.lngLat.toArray();
  const offset = [clickedAt[0] - center[0], clickedAt[1] - center[1]] as const;

  const getCoord = (e: MapMouseEvent | MapTouchEvent) =>
    [e.lngLat.toArray()[0] - offset[0], e.lngLat.toArray()[1] - offset[1]] as [
      number,
      number,
    ];
  let draggedCoord: [number, number] | undefined;

  const handleMove = (e: MapMouseEvent | MapTouchEvent) => {
    e.preventDefault();
    draggedCoord = getCoord(e);
    drawing.setReplacementPoint(pointIndex, { coord: draggedCoord, pointIndex });
  };

  const listeners = [
    map.on("mousemove", handleMove),
    map.on("touchmove", handleMove),
  ];

  const finish = () => {
    listeners.forEach((l) => l.unsubscribe());
    drawing.hasDragger = false;

    const finalCoord = draggedCoord ?? center;
    if (onFinish) {
      onFinish(finalCoord);
    } else if (draggedCoord) {
      drawing.updateTrack((t) => ({
        ...t,
        coordinates: t.coordinates.map((c, i) =>
          i === pointIndex ? draggedCoord! : c,
        ),
      }));
    }

    drawing.setReplacementPoint(pointIndex, undefined);
    drawing.recomputeRoutesForPoint(pointIndex);
  };
  listeners.push(map.on("mouseup", finish));
  listeners.push(map.on("touchend", finish));
};

interface IndexedPoint {
  coord: [number, number];
  pointIndex: number;
}

export class Drawing {
  hasDragger = false;
  mode: 'straight' | 'snap' = 'straight';

  #routedSegments: globalThis.Map<string, [number, number][]> = new globalThis.Map();
  #routingManager: RoutingManager | undefined;

  get features(): GeoJSON.FeatureCollection {
    const coords = [
      ...(this.#track?.coordinates?.map(
        (c, i) => this.#replacementPoints[i]?.coord ?? c,
      ) ?? []),
    ];
    const points: GeoJSON.Feature[] = coords.map((c, i) => ({
      type: "Feature",
      properties: {
        class: "point",
        pointIndex: i,
      },
      id: i,
      geometry: {
        type: "Point",
        coordinates: c,
      },
    }));

    const lines: GeoJSON.Feature[] = range(coords.length - 1).map((i) => ({
      id: i + points.length,
      type: "Feature",
      properties: {
        class: "segment",
        pointIndex: i,
      },
      geometry: {
        type: "LineString",
        coordinates: this.#getSegmentCoords(i, coords as [number, number][]),
      },
    }));

    const additionalPoints: GeoJSON.Feature[] = this.#closestPoint
      ? [
          {
            type: "Feature",
            properties: {
              class: "split-point",
            },
            id: points.length + lines.length + 1,
            geometry: {
              type: "Point",
              coordinates: this.#closestPoint.coord,
            },
          },
        ]
      : [];
    return {
      type: "FeatureCollection",
      features: [...points, ...lines, ...additionalPoints],
    };
  }

  #getSegmentCoords(i: number, coords: [number, number][]): [number, number][] {
    if (this.mode === 'snap') {
      const key = segKey(coords[i], coords[i + 1]);
      const routed = this.#routedSegments.get(key);
      if (routed) return routed;
    }
    return [coords[i], coords[i + 1]];
  }

  #replacementPoints: { [index: number]: IndexedPoint } = {};
  clearClosestPoint() {
    if (!this.#closestPoint) return;
    this.#closestPoint = undefined;
    this.notifyListeners();
  }

  setReplacementPoint(index: number, indexedPoint: IndexedPoint | undefined) {
    if (indexedPoint) {
      this.#replacementPoints[index] = indexedPoint;
    } else {
      delete this.#replacementPoints[index];
    }
    this.notifyListeners();
  }

  #sourceId = "drawing-source";
  #map: Map;

  // The closest point on the track to the mouse. When the user clicks on the track it will be split at this point.
  #closestPoint: { coord: [number, number]; pointIndex: number } | undefined;

  #listeners: Listener[] = [];
  #track: Track;
  get track() {
    return this.#track;
  }

  get bounds(): LngLatBounds {
    const bounds = new LngLatBounds();
    for (const point of this.#track.coordinates) {
      bounds.extend(point);
    }
    return bounds;
  }

  #undoStack: Track[] = [];
  #redoStack: Track[] = [];

  get canUndo(): boolean {
    return this.#undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.#redoStack.length > 0;
  }

  get canClear(): boolean {
    return this.#track.coordinates.length > 0;
  }

  get source(): GeoJSONSource {
    return this.#map.getSource(this.#sourceId) as GeoJSONSource;
  }

  #subscriptions: Subscription[] = [];
  #layers = [
    "hit-test-lines",
    "hit-test-points",
    "lines",
    "points",
    "split-points",
  ];

  constructor(map: Map, track: Track, routingManager?: RoutingManager) {
    this.#map = map;
    this.#track = track;
    this.#routingManager = routingManager;

    this.#map.addSource(this.#sourceId, {
      type: "geojson",
      data: this.features,
    });

    this.addListener((drawing) => this.source.setData(drawing.features));

    // Add hover state handlers:
    addHoverState(this.#map, ["hit-test-lines", "hit-test-points"]);

    const updateClosestPoint = (
      e: (MapTouchEvent | MapMouseEvent) & {
        features?: MapGeoJSONFeature[];
      },
    ) => {
      if (this.hasDragger) return;
      const feature = e.features?.[0];
      if (!feature) return;

      if (feature.geometry.type !== "LineString") return;

      const start = feature.geometry.coordinates.at(0)!;
      const end = feature.geometry.coordinates.at(-1)!;

      const mouse = e.lngLat.toArray() as [number, number];
      const closest = getClosestPoint(
        start as [number, number],
        end as [number, number],
        mouse,
      );
      this.#closestPoint = {
        coord: closest,
        pointIndex: feature.properties.pointIndex,
      };

      this.notifyListeners();
    };

    // Add interaction handlers:
    // When the mouse hovers over a line, we find the closest point on the line and store it:
    this.#subscriptions.push(
      this.#map.on("mousemove", "hit-test-lines", updateClosestPoint),
      this.#map.on("touchstart", "hit-test-lines", updateClosestPoint),
    );

    // When the mouse leaves the hit-test-lines layer, we clear the closest point:
    const handleEndClosestPoint = () => {
      this.#closestPoint = undefined;
      this.notifyListeners();
    };

    this.#subscriptions.push(
      this.#map.on("mouseleave", "hit-test-lines", handleEndClosestPoint),
      this.#map.on("touchend", "hit-test-lines", handleEndClosestPoint),

      // When the mouse is over a join, we shouldn't show the split point.
      this.#map.on("mousemove", "hit-test-points", handleEndClosestPoint),
    );

    const handleCreatePointDragger = (
      e: (MapMouseEvent | MapTouchEvent) & {
        features?: MapGeoJSONFeature[];
      },
    ) => {
      e.preventDefault();
      createDragger(this.#map, e, this);
    };

    this.#subscriptions.push(
      this.#map.on("mousedown", "hit-test-points", handleCreatePointDragger),
      this.#map.on("touchstart", "hit-test-points", handleCreatePointDragger),
    );

    const handleCreatePointAndDrag = (
      e: (MapMouseEvent | MapTouchEvent) & {
        features?: GeoJSONFeature[];
      },
    ) => {
      e.preventDefault();

      if (this.hasDragger) return;

      if (!this.#closestPoint) {
        return;
      }

      const insertAfter = this.#closestPoint.pointIndex;
      const pointIndex = insertAfter + 1;
      const insertCoord = this.#closestPoint.coord;
      const trackBeforeInsert = this.#track;
      this.#closestPoint = undefined;

      // Insert the point visually without creating an undo entry yet
      const insertedCoords = [...trackBeforeInsert.coordinates];
      insertedCoords.splice(pointIndex, 0, insertCoord);
      this.updateTrackSilently({ coordinates: insertedCoords });

      createDragger(
        this.#map,
        {
          lngLat: e.lngLat,
          features: [
            {
              geometry: {
                type: "Point",
                coordinates: insertedCoords[pointIndex],
              },
              properties: {
                pointIndex: pointIndex,
              },
              id: pointIndex,
            } as any,
          ],
        },
        this,
        (finalCoord) => {
          // Restore pre-insert state so updateTrack records the correct undo entry
          this.#track = trackBeforeInsert;
          const finalCoords = [...trackBeforeInsert.coordinates];
          finalCoords.splice(pointIndex, 0, finalCoord);
          this.updateTrack({ coordinates: finalCoords });
        },
      );
    };

    this.#subscriptions.push(
      this.#map.on("touchstart", "hit-test-lines", handleCreatePointAndDrag),
      this.#map.on("mousedown", "hit-test-lines", handleCreatePointAndDrag),

      this.#map.on("click", (e) => {
        if (e.defaultPrevented) return;
        const prevCoords = this.#track.coordinates as [number, number][];
        this.updateTrack((t) => ({
          ...t,
          coordinates: [...t.coordinates, e.lngLat.toArray()],
        }));
        if (this.mode === 'snap' && prevCoords.length >= 1) {
          const newCoords = this.#track.coordinates as [number, number][];
          this.#requestRoute(
            prevCoords[prevCoords.length - 1],
            newCoords[newCoords.length - 1],
          );
        }
      }),
    );

    setTimeout(() => this.initialize(), 1000);
  }

  async #requestRoute(from: [number, number], to: [number, number]) {
    if (!this.#routingManager) return;
    const key = segKey(from, to);
    if (this.#routedSegments.has(key)) return;
    const coords = await this.#routingManager.route(from, to);
    if (!coords) return;
    this.#routedSegments.set(key, coords);
    this.notifyListeners();
  }

  setMode(mode: 'straight' | 'snap') {
    this.mode = mode;
    this.#routedSegments.clear();
    if (mode === 'snap') {
      const coords = this.#track.coordinates as [number, number][];
      for (let i = 0; i < coords.length - 1; i++) {
        this.#requestRoute(coords[i], coords[i + 1]);
      }
    }
    this.notifyListeners();
  }

  recomputeRoutesForPoint(pointIndex: number) {
    if (this.mode !== 'snap' || !this.#routingManager) return;
    const coords = this.#track.coordinates as [number, number][];
    if (pointIndex > 0 && pointIndex < coords.length) {
      this.#requestRoute(coords[pointIndex - 1], coords[pointIndex]);
    }
    if (pointIndex < coords.length - 1) {
      this.#requestRoute(coords[pointIndex], coords[pointIndex + 1]);
    }
  }

  initialize() {
    // Render the track:
    this.#map.addLayer({
      id: "lines",
      type: "line",
      source: this.#sourceId,
      filter: ["==", "class", "segment"],
      layout: {
        visibility: "visible",
        "line-cap": "butt",
        "line-join": "bevel",
      },
      paint: {
        "line-width": 5,
        "line-color": "rgb(0, 0, 255)",
        "line-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          1,
          0.5,
        ],
      },
    });

    this.#map.addLayer({
      id: "points",
      type: "circle",
      source: this.#sourceId,
      layout: {
        visibility: "visible",
      },
      filter: ["==", "class", "point"],
      paint: {
        "circle-color": "rgba(0, 0, 255, 1)",
        "circle-stroke-color": "white",
        "circle-stroke-width": 1,
        "circle-radius": 6,
        "circle-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          1,
          0.5,
        ],
      },
    });

    // // Add hit testing layers:
    this.#map.addLayer({
      id: "hit-test-lines",
      type: "line",
      source: this.#sourceId,
      filter: ["==", "class", "segment"],
      paint: {
        "line-width": 20,
        "line-opacity": 0,
      },
    });

    this.#map.addLayer({
      id: "hit-test-points",
      type: "circle",
      source: this.#sourceId,
      layout: {
        visibility: "visible",
      },
      filter: ["==", "class", "point"],
      paint: {
        "circle-radius": 10,
        "circle-opacity": 0,
      },
    });

    this.#map.addLayer({
      id: "split-points",
      source: this.#sourceId,
      type: "circle",
      layout: {
        visibility: "visible",
      },
      filter: ["==", "class", "split-point"],
      paint: {
        "circle-color": "rgba(100, 100, 255, 1)",
        "circle-stroke-color": "white",
        "circle-stroke-width": 1,
        "circle-radius": 5,
      },
    });
  }

  updateTrackSilently(change: Partial<Track> | ((track: Track) => Track)) {
    const newValue =
      typeof change === "function"
        ? change(this.#track)
        : { ...this.#track, ...change };
    newValue.id = this.#track.id;
    this.#track = newValue;
    this.notifyListeners();
  }

  updateTrack(change: Partial<Track> | ((track: Track) => Track)) {
    const newValue =
      typeof change === "function"
        ? change(this.#track)
        : { ...this.#track, ...change };

    this.#undoStack.push(this.#track);
    this.#redoStack = [];
    newValue.id = this.#track.id;
    this.#track = newValue;

    this.notifyListeners();
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
    this.#track = { ...this.#track, coordinates: [], elevations: undefined };
    this.#undoStack = [];
    this.#redoStack = [];
    this.#routedSegments.clear();
    this.notifyListeners();
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
    this.#listeners = this.#listeners.filter((l) => l !== listener);
  }

  destroy() {
    for (const subscription of this.#subscriptions) {
      subscription.unsubscribe();
    }

    for (const layer of this.#layers) {
      this.#map.removeLayer(layer);
    }

    this.#map.removeSource(this.#sourceId);
  }
}
