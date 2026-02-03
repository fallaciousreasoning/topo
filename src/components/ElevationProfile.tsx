import React, { useEffect, useState, useRef } from 'react';
import { Track } from '../tracks/track';
import { getElevation } from '../layers/contours';
import { useDrawing } from '../draw/Drawing';
import { getDistance } from '../utils/distance';

const SAMPLE_INTERVAL = 20; // meters
const ELEVATION_ZOOM_LEVEL = 12;

interface ElevationProfileProps {
  onClose: () => void;
}

// Generate sample points along the track at regular intervals
function generateSamplePoints(coordinates: [number, number][]): { coord: [number, number]; distance: number }[] {
  if (coordinates.length === 0) return [];

  // Calculate total distance and create segments
  const segments: { start: [number, number]; end: [number, number]; startDistance: number; endDistance: number }[] = [];
  let totalDistance = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const start = coordinates[i - 1];
    const end = coordinates[i];
    const segmentDistance = getDistance(start[1], start[0], end[1], end[0]) * 1000; // Convert km to meters
    
    segments.push({
      start: [start[0], start[1]],
      end: [end[0], end[1]],
      startDistance: totalDistance,
      endDistance: totalDistance + segmentDistance
    });
    
    totalDistance += segmentDistance;
  }

  const samplePoints: { coord: [number, number]; distance: number }[] = [];
  
  // Always include the first point
  samplePoints.push({
    coord: [coordinates[0][0], coordinates[0][1]],
    distance: 0
  });

  // Sample at regular intervals
  for (let distance = SAMPLE_INTERVAL; distance < totalDistance; distance += SAMPLE_INTERVAL) {
    // Find which segment this distance falls into
    const segment = segments.find(s => distance >= s.startDistance && distance <= s.endDistance);
    if (!segment) continue;

    // Interpolate position within the segment
    const segmentLength = segment.endDistance - segment.startDistance;
    const segmentProgress = (distance - segment.startDistance) / segmentLength;
    
    const interpolatedLng = segment.start[0] + (segment.end[0] - segment.start[0]) * segmentProgress;
    const interpolatedLat = segment.start[1] + (segment.end[1] - segment.start[1]) * segmentProgress;
    
    samplePoints.push({
      coord: [interpolatedLng, interpolatedLat],
      distance: distance
    });
  }

  // Always include the last point
  if (coordinates.length > 1) {
    const lastCoord = coordinates[coordinates.length - 1];
    samplePoints.push({
      coord: [lastCoord[0], lastCoord[1]],
      distance: totalDistance
    });
  }

  return samplePoints;
}

// Hook to listen to track changes from drawing
function useTrackListener() {
  const drawing = useDrawing();
  const [currentTrack, setCurrentTrack] = useState<Track>(drawing.track);

  useEffect(() => {
    const unsubscribe = drawing.addListener((drawingInstance) => {
      setCurrentTrack({ ...drawingInstance.track });
    });
    return unsubscribe;
  }, [drawing]);

  return currentTrack;
}

// Hook to fetch elevation data for track coordinates
function useElevationData(track: Track) {
  const [elevations, setElevations] = useState<{ distance: number; elevation: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!track.coordinates.length) {
      setElevations([]);
      return;
    }

    setLoading(true);
    const fetchElevations = async () => {
      const samplePoints = generateSamplePoints(track.coordinates);
      const points: { distance: number; elevation: number }[] = [];

      // Fetch elevations for all sample points
      for (const samplePoint of samplePoints) {
        try {
          const elevation = await getElevation([samplePoint.coord[1], samplePoint.coord[0]], ELEVATION_ZOOM_LEVEL);
          points.push({ distance: samplePoint.distance, elevation });
        } catch (error) {
          console.warn(`Failed to get elevation for sample point:`, error);
          points.push({ distance: samplePoint.distance, elevation: 0 });
        }
      }

      setElevations(points);
      setLoading(false);
    };

    fetchElevations();
  }, [track.coordinates]);

  return { elevations, loading };
}

export default function ElevationProfile({ onClose }: ElevationProfileProps) {
  const currentTrack = useTrackListener();
  const { elevations, loading } = useElevationData(currentTrack);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!elevations.length || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Find min/max values
    const maxDistance = Math.max(...elevations.map(p => p.distance));
    const minElevation = Math.min(...elevations.map(p => p.elevation));
    const maxElevation = Math.max(...elevations.map(p => p.elevation));
    const elevationRange = maxElevation - minElevation;

    // Draw grid lines
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let i = 0; i <= 5; i++) {
      const x = padding + (chartWidth * i / 5);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight * i / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw elevation profile
    ctx.strokeStyle = '#0066cc';
    ctx.fillStyle = 'rgba(0, 102, 204, 0.2)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    elevations.forEach((point, index) => {
      const x = padding + (point.distance / maxDistance) * chartWidth;
      const y = height - padding - ((point.elevation - minElevation) / elevationRange) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    // Fill under the line
    const firstPoint = elevations[0];
    const lastPoint = elevations[elevations.length - 1];
    
    if (firstPoint && lastPoint) {
      const firstX = padding + (firstPoint.distance / maxDistance) * chartWidth;
      const lastX = padding + (lastPoint.distance / maxDistance) * chartWidth;
      
      ctx.lineTo(lastX, height - padding);
      ctx.lineTo(firstX, height - padding);
      ctx.closePath();
      ctx.fill();
      
      // Redraw the stroke
      ctx.beginPath();
      elevations.forEach((point, index) => {
        const x = padding + (point.distance / maxDistance) * chartWidth;
        const y = height - padding - ((point.elevation - minElevation) / elevationRange) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // Draw labels
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    // Distance labels
    for (let i = 0; i <= 5; i++) {
      const distance = (maxDistance * i / 5) / 1000; // Convert to km
      const x = padding + (chartWidth * i / 5);
      ctx.fillText(`${distance.toFixed(1)}km`, x, height - 10);
    }

    // Elevation labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const elevation = minElevation + (elevationRange * (5 - i) / 5);
      const y = padding + (chartHeight * i / 5) + 4;
      ctx.fillText(`${Math.round(elevation)}m`, padding - 10, y);
    }

  }, [elevations]);

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Elevation Profile</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ×
        </button>
      </div>
      
      {elevations.length > 0 ? (
        <div className="space-y-2 relative">
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded">
              <div className="text-gray-500">Loading elevation data...</div>
            </div>
          )}
          <canvas 
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full h-48 border border-gray-200"
          />
          <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
            <span>Distance: {(Math.max(...elevations.map(p => p.distance)) / 1000).toFixed(2)} km</span>
            <span className="text-center">
              Elevation: {Math.round(Math.min(...elevations.map(p => p.elevation)))}m - {Math.round(Math.max(...elevations.map(p => p.elevation)))}m
            </span>
            <span className="text-right">
              {(() => {
                let totalUp = 0;
                let totalDown = 0;
                for (let i = 1; i < elevations.length; i++) {
                  const diff = elevations[i].elevation - elevations[i - 1].elevation;
                  if (diff > 0) totalUp += diff;
                  else totalDown += Math.abs(diff);
                }
                return `↗ ${Math.round(totalUp)}m ↘ ${Math.round(totalDown)}m`;
              })()}
            </span>
          </div>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center">
          <div className="text-gray-500">No elevation data available</div>
        </div>
      )}
    </div>
  );
}
