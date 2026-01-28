import * as React from "react";
import { useEffect, useState } from "react";
import type { OverlayDefinition } from "./config";
import Layer from '../map/Layer'
import Source from '../map/Source'
import { useMap } from "../map/Map";
import proj4 from 'proj4'
import type { FeatureCollection, Feature, LineString, Point } from 'geojson'

const minZoom = 8
const bigGridZoom = 11.5

// Function to generate grid lines for the current viewport
function generateGridGeoJSON(bounds: [[number, number], [number, number]], zoom: number): {
    lines: FeatureCollection<LineString>,
    labels: FeatureCollection<Point>
} {
    const [[west, south], [east, north]] = bounds;

    // Determine grid interval based on zoom level
    // Zoom 10-11: 10km grid
    // Zoom 12+: 1km grid
    const gridInterval = zoom < bigGridZoom ? 10000 : 1000;

    // Convert bounds to NZTM (EPSG:2193)
    const [xMin, yMin] = proj4('EPSG:4326', 'EPSG:2193', [west, south]);
    const [xMax, yMax] = proj4('EPSG:4326', 'EPSG:2193', [east, north]);

    // Round to grid boundaries
    const gridXMin = Math.floor(xMin / gridInterval) * gridInterval;
    const gridXMax = Math.ceil(xMax / gridInterval) * gridInterval;
    const gridYMin = Math.floor(yMin / gridInterval) * gridInterval;
    const gridYMax = Math.ceil(yMax / gridInterval) * gridInterval;

    const lineFeatures: Feature<LineString>[] = [];
    const labelFeatures: Feature<Point>[] = [];

    // Generate vertical lines (constant easting)
    for (let x = gridXMin; x <= gridXMax; x += gridInterval) {
        const [startLng, startLat] = proj4('EPSG:2193', 'EPSG:4326', [x, gridYMin]);
        const [endLng, endLat] = proj4('EPSG:2193', 'EPSG:4326', [x, gridYMax]);

        lineFeatures.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [[startLng, startLat], [endLng, endLat]]
            },
            properties: {
                type: 'vertical',
                value: x
            }
        });

        // Add label at bottom of line
        if (zoom >= bigGridZoom) {
            labelFeatures.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [startLng, startLat]
                },
                properties: {
                    label: `${(x / 1000).toFixed(0)}E`,
                    value: x
                }
            });
        }
    }

    // Generate horizontal lines (constant northing)
    for (let y = gridYMin; y <= gridYMax; y += gridInterval) {
        const [startLng, startLat] = proj4('EPSG:2193', 'EPSG:4326', [gridXMin, y]);
        const [endLng, endLat] = proj4('EPSG:2193', 'EPSG:4326', [gridXMax, y]);

        lineFeatures.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [[startLng, startLat], [endLng, endLat]]
            },
            properties: {
                type: 'horizontal',
                value: y
            }
        });

        // Add label at left of line
        if (zoom >= bigGridZoom) {
            labelFeatures.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [startLng, startLat]
                },
                properties: {
                    label: `${(y / 1000).toFixed(0)}N`,
                    value: y
                }
            });
        }
    }

    return {
        lines: {
            type: 'FeatureCollection',
            features: lineFeatures
        },
        labels: {
            type: 'FeatureCollection',
            features: labelFeatures
        }
    };
}

// Component that dynamically updates the grid
function UTMGridComponent() {
    const { map } = useMap();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!map) return;

        const updateGrid = () => {
            const bounds = map.getBounds();
            const zoom = map.getZoom();

            // Only show grid at zoom level 8 and above
            if (zoom < minZoom) {
                setIsVisible(false);
                return;
            }

            setIsVisible(true);

            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();

            const newGridData = generateGridGeoJSON(
                [[sw.lng, sw.lat], [ne.lng, ne.lat]],
                zoom
            );

            // Update the source data directly
            const linesSource = map.getSource('utm-grid-lines');
            const labelsSource = map.getSource('utm-grid-labels');

            if (linesSource && linesSource.type === 'geojson') {
                linesSource.setData(newGridData.lines);
            }

            if (labelsSource && labelsSource.type === 'geojson') {
                labelsSource.setData(newGridData.labels);
            }
        };

        // Wait for sources to be added
        const onStyleData = () => {
            if (map.getSource('utm-grid-lines') && map.getSource('utm-grid-labels')) {
                updateGrid();
            }
        };

        map.on('styledata', onStyleData);
        map.on('move', updateGrid);
        map.on('zoom', updateGrid);

        updateGrid();

        return () => {
            map.off('styledata', onStyleData);
            map.off('move', updateGrid);
            map.off('zoom', updateGrid);
        };
    }, [map]);

    if (!isVisible) return null;

    return (
        <React.Fragment key='utm-grid'>
            <Source id='utm-grid-lines' spec={{
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            }}>
                <Layer layer={{
                    id: 'utm-grid-lines',
                    type: 'line',
                    source: 'utm-grid-lines',
                    paint: {
                        "line-color": "#0066cc",
                        "line-width": 1,
                        "line-opacity": 0.5
                    }
                }} />
            </Source>

            <Source id='utm-grid-labels' spec={{
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            }}>
                <Layer layer={{
                    id: 'utm-grid-labels',
                    type: 'symbol',
                    source: 'utm-grid-labels',
                    layout: {
                        "text-field": ["get", "label"],
                        "text-size": 10,
                        "text-font": ["Open Sans Regular"],
                        "text-offset": [0, -0.5],
                        "text-anchor": "bottom"
                    },
                    paint: {
                        "text-color": "#0066cc",
                        "text-halo-color": "white",
                        "text-halo-width": 1,
                        "text-opacity": 0.8
                    }
                }} />
            </Source>
        </React.Fragment>
    );
}

export default {
    id: 'utm-grid',
    name: 'UTM Grid',
    description: '1km UTM grid in NZTM (EPSG:2193) coordinates',
    type: 'overlay',
    cacheable: false,
    defaultOpacity: 0.7,
    source: <UTMGridComponent />
} as OverlayDefinition;
