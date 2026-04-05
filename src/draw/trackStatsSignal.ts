import * as React from 'react';

export interface TrackStats {
  distanceM: number;
  totalUp: number;
  totalDown: number;
}

const listeners = new Set<() => void>();
let _stats: TrackStats | null = null;

export function publishTrackStats(stats: TrackStats | null) {
  _stats = stats;
  listeners.forEach(fn => fn());
}

export function useTrackStats(): TrackStats | null {
  const [, rerender] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, []);
  return _stats;
}
