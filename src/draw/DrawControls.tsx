import * as React from "react";
import Control from "../controls/Control";
import { useDrawing } from "./Drawing";
import { useRouteUpdater } from "../routing/router";
import ElevationProfile from "../components/ElevationProfile";

export default function DrawControls() {
  const drawing = useDrawing();
  const updateRoute = useRouteUpdater();
  const [showElevationProfile, setShowElevationProfile] = React.useState(false);

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
