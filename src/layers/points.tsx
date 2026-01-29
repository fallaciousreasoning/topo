import React, { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../caches/indexeddb";
import { OverlayDefinition } from "./config";
import Layer from "../map/Layer";
import Source from "../map/Source";
import { useLayerHandler } from "../hooks/useLayerClickHandler";
import { useRouteUpdater } from "../routing/router";
import { useMap } from "../map/Map";

export default {
  id: "points",
  name: "Points",
  description: "Saved Points",
  type: "overlay",
  cacheable: false,
  source: () => {
    const points = useLiveQuery(() => db.getPoints(), []) ?? [];
    const updateRoute = useRouteUpdater();
    const { map } = useMap();

    useLayerHandler("click", "points-circle", (e) => {
      const feature = e.features?.[0];
      if (!feature) return;

      const pointId = feature.properties?.id;
      if (!pointId) return;

      updateRoute({
        page: `point/${pointId}`,
      });
    });

    useLayerHandler("mouseenter", "points-circle", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    useLayerHandler("mouseleave", "points-circle", () => {
      map.getCanvas().style.cursor = "";
    });

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: points.map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: point.coordinates,
        },
        properties: {
          id: point.id,
          name: point.name ?? `Point ${point.id}`,
          tags: point.tags,
          description: point.description,
          color: point.color ?? "#3b82f6",
        },
      })),
    };

    // Update the source data when points change
    useEffect(() => {
      const source = map.getSource("points") as any;
      if (source && source.setData) {
        source.setData(geojson);
      }
    }, [points, map]);

    if (points.length === 0) return null;

    return (
      <Source id="points" spec={{ type: "geojson", data: geojson }}>
        {/* Circle layer for the point markers */}
        <Layer
          layer={{
            id: "points-circle",
            type: "circle",
            source: "points",
            paint: {
              "circle-radius": {
                stops: [
                  [10, 4],
                  [13, 6],
                  [16, 8],
                ],
              },
              "circle-color": ["get", "color"],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          }}
        />
        {/* Label layer for point names */}
        <Layer
          layer={{
            id: "points-label",
            type: "symbol",
            source: "points",
            minzoom: 12,
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Open Sans Regular"],
              "text-size": 12,
              "text-offset": [0, 1.5],
              "text-anchor": "top",
            },
            paint: {
              "text-color": ["get", "color"],
              "text-halo-color": "#ffffff",
              "text-halo-width": 2,
            },
          }}
        />
      </Source>
    );
  },
} as OverlayDefinition;
