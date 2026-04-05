import * as React from "react";
import Control from "../controls/Control";
import { useDrawing } from "./Drawing";
import { useRouteUpdater } from "../routing/router";
import ElevationProfile from "../components/ElevationProfile";
import { publishTrackStats } from "./trackStatsSignal";
import { buildFullCoordinates, generateSamplePoints } from "../tracks/trackUtils";
import { getElevation } from "../layers/contours";
import { getLineLength } from "../utils/distance";
import { Track } from "../tracks/track";

const ELEVATION_ZOOM_LEVEL = 12;
const STATS_SAMPLE_INTERVAL = 50; // metres — coarser than elevation profile to reduce API calls

function usePublishTrackStats(track: Track) {
  React.useEffect(() => {
    let cancelled = false;

    const coords = buildFullCoordinates(track);
    const distanceM = getLineLength(coords) * 1000;

    // Publish distance immediately without waiting for elevation
    publishTrackStats({ distanceM, totalUp: 0, totalDown: 0 });

    if (coords.length < 2) return;

    const compute = async () => {
      const points = generateSamplePoints(coords, STATS_SAMPLE_INTERVAL);
      let totalUp = 0;
      let totalDown = 0;
      let prevEle: number | null = null;

      for (const p of points) {
        if (cancelled) return;
        try {
          const ele = await getElevation([p.coord[1], p.coord[0]], ELEVATION_ZOOM_LEVEL);
          if (prevEle !== null) {
            const diff = ele - prevEle;
            if (diff > 0) totalUp += diff;
            else totalDown += Math.abs(diff);
          }
          prevEle = ele;
        } catch {
          // skip bad tiles
        }
      }

      if (!cancelled) publishTrackStats({ distanceM, totalUp, totalDown });
    };

    // Debounce: wait 800ms after last track change before fetching elevations
    const timer = setTimeout(compute, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [track.coordinates, track.routedSegments]);

  // Clear stats on unmount
  React.useEffect(() => {
    return () => publishTrackStats(null);
  }, []);
}

export default function DrawControls() {
  const drawing = useDrawing();
  const updateRoute = useRouteUpdater();
  const [showElevationProfile, setShowElevationProfile] = React.useState(false);

  usePublishTrackStats(drawing.track);

  return (
    <>
      <Control position="top-left">
        <button
          type="button"
          disabled={!drawing.canUndo}
          onClick={() => drawing.undo()}
        >
          ↶
        </button>
        <button
          type="button"
          disabled={!drawing.canRedo}
          onClick={() => drawing.redo()}
        >
          ↷
        </button>
        <button
          type="button"
          disabled={!drawing.canClear}
          onClick={() => drawing.clear()}
        >
          ⨯
        </button>
        <button
          type="button"
          title={drawing.mode === 'straight' ? 'Switch to path snapping' : 'Switch to straight lines'}
          onClick={() => drawing.setMode(drawing.mode === 'straight' ? 'snap' : 'straight')}
        >
          {drawing.mode === 'straight' ? '—' : '~'}
        </button>
        <button
          type="button"
          disabled={drawing.track.coordinates.length < 2}
          onClick={() => setShowElevationProfile(!showElevationProfile)}
          title="Toggle elevation profile"
        >
          📈
        </button>
        <button
          type="button"
          onClick={() => updateRoute({ editingFeature: null })}
        >
          ✓
        </button>
      </Control>

      {showElevationProfile && drawing.track.coordinates.length >= 2 && (
        <ElevationProfile
          onClose={() => setShowElevationProfile(false)}
        />
      )}
    </>
  );
}
