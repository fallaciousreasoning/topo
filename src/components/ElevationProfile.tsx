import React, { useEffect, useState } from 'react';
import { Track } from '../tracks/track';
import { useDrawing } from '../draw/Drawing';
import ElevationChart from './ElevationChart';

function useTrackListener() {
  const drawing = useDrawing();
  const [currentTrack, setCurrentTrack] = useState<Track>(drawing.track);

  useEffect(() => {
    const unsubscribe = drawing.addListener((d) => setCurrentTrack({ ...d.track }));
    return unsubscribe;
  }, [drawing]);

  return currentTrack;
}

export default function ElevationProfile({ onClose }: { onClose: () => void }) {
  const track = useTrackListener();

  if (track.coordinates.length < 2) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-xl shadow-lg p-4 max-w-2xl mx-auto z-20">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-700">Elevation Profile</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>
      <ElevationChart track={track} />
    </div>
  );
}
