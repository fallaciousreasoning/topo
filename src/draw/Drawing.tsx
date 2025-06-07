import { createContext } from "react";
import { Drawing } from "./drawing";
import { useMap } from "../map/Map";
import * as React from "react";
import DrawControls from "./DrawControls";
import { useParams } from "../routing/router";
import db from "../caches/indexeddb";
import { usePromise } from "../hooks/usePromise";
import { debounce } from "../utils/debounce";

const Context = createContext<Drawing | undefined>(undefined);

const debouncedSave = debounce(db.updateTrack, 500);

function EditableTrack({ id }: { id: number }) {
  const { map } = useMap();

  const drawing = React.useRef<Drawing | undefined>(undefined);

  React.useEffect(() => {
    let unloaded = false;
    let unsubscribe: (() => void) | undefined;

    const getTrack = async () => {
      const track = await db.getTrack(id);
      if (!track || unloaded) return;
      drawing.current = new Drawing(map, track);
      if (track.coordinates.length > 1)
        map.fitBounds(drawing.current.bounds, { padding: 100 });
      unsubscribe = drawing.current.addListener(() => {
        if (drawing.current) debouncedSave(drawing.current?.track);
      });
    };

    getTrack();

    return () => {
      unloaded = true;
      unsubscribe?.();
      drawing.current?.destroy();
      drawing.current = undefined;
    };
  }, [id, map]);

  return drawing.current ? (
    <Context.Provider value={drawing.current}>
      <DrawControls />
    </Context.Provider>
  ) : null;
}

export default function () {
  const { editingFeature } = useParams();

  if (!editingFeature) {
    return null;
  }

  return <EditableTrack id={editingFeature} />;
}

export function useDrawing() {
  const drawing = React.useContext(Context);
  return drawing!;
}
