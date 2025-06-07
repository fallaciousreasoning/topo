import * as React from "react";
import Control from "../controls/Control";
import { useDrawing } from "./Drawing";
import { useRouteUpdater } from "../routing/router";

export default function DrawControls() {
  const drawing = useDrawing();
  const updateRoute = useRouteUpdater();

  return (
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
        onClick={() => updateRoute({ editingFeature: null })}
      >
        ✓
      </button>
    </Control>
  );
}
