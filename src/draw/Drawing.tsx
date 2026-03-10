import { createContext } from "react";
import { Drawing } from "./drawing";
import { useMap } from "../map/Map";
import * as React from "react";
import DrawControls from "./DrawControls";
import { useParams } from "../routing/router";
import db from "../caches/indexeddb";
import { usePromise } from "../hooks/usePromise";
import { debounce } from "../utils/debounce";
import { RoutingManager } from "./routingManager";

const Context = createContext<Drawing | undefined>(undefined);

const debouncedSave = debounce(db.updateTrack, 500);

function EditableTrack({ id }: { id: number }) {
  const { map } = useMap();
  const [drawing, setDrawing] = React.useState<Drawing | undefined>(undefined);
  const [, setVersion] = React.useState(0);

  const routingManagerRef = React.useRef<RoutingManager | null>(null);
  if (!routingManagerRef.current) {
    routingManagerRef.current = new RoutingManager();
  }

  React.useEffect(() => {
    return () => {
      routingManagerRef.current?.destroy();
      routingManagerRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    let d: Drawing | undefined;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    db.getTrack(id).then(track => {
      if (cancelled || !track) return;
      d = new Drawing(map, track, routingManagerRef.current ?? undefined);
      setDrawing(d);
      if (track.coordinates.length > 1)
        map.fitBounds(d.bounds, { padding: 100 });
      unsubscribe = d.addListener(() => {
        debouncedSave(d!.track);
        setVersion(v => v + 1);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      d?.destroy();
      setDrawing(undefined);
    };
  }, [id, map]);

  return drawing ? (
    <Context.Provider value={drawing}>
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
