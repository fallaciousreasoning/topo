import * as React from 'react';

const listeners = new Set<() => void>();
let _hasLocation = false;

export function publishHasLocation(value: boolean) {
  if (_hasLocation === value) return;
  _hasLocation = value;
  listeners.forEach(fn => fn());
}

export function useHasLocation(): boolean {
  const [, rerender] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, []);
  return _hasLocation;
}
