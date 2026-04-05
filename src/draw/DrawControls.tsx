import * as React from "react";
import Control from "../controls/Control";
import { useDrawing } from "./Drawing";
import { useRouteUpdater } from "../routing/router";
import ElevationProfile from "../components/ElevationProfile";

function PointContextMenu({ drawing }: { drawing: ReturnType<typeof useDrawing> }) {
  const ctx = drawing.contextMenuPoint;
  if (!ctx) return null;
  const snapped = drawing.isPointSnapped(ctx.pointIndex);
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 50 }}
        onClick={() => drawing.clearContextMenu()}
        onContextMenu={(e) => { e.preventDefault(); drawing.clearContextMenu(); }}
      />
      <div
        style={{ position: 'fixed', left: ctx.x + 4, top: ctx.y + 4, zIndex: 51 }}
        className="bg-white rounded shadow-lg overflow-hidden text-sm min-w-36"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="block w-full px-3 py-2 text-left hover:bg-gray-100"
          onClick={() => snapped ? drawing.unSnapPoint(ctx.pointIndex) : drawing.snapPoint(ctx.pointIndex)}
        >
          {snapped ? 'Use straight line' : 'Snap to track'}
        </button>
        <button
          type="button"
          className="block w-full px-3 py-2 text-left hover:bg-gray-100 text-red-600"
          onClick={() => drawing.deletePoint(ctx.pointIndex)}
        >
          Delete point
        </button>
      </div>
    </>
  );
}

export default function DrawControls() {
  const drawing = useDrawing();
  const updateRoute = useRouteUpdater();
  const [showElevationProfile, setShowElevationProfile] = React.useState(false);

  return (
    <>
      <PointContextMenu drawing={drawing} />
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
