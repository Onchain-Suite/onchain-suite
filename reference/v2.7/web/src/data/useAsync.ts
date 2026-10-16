import { useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/** Minimal async-read hook with loading/error states. Stands in for React Query in Phase 1. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  useEffect(() => {
    let live = true;
    setState({ data: null, loading: true, error: null });
    fn()
      .then((data) => live && setState({ data, loading: false, error: null }))
      .catch((error: Error) => live && setState({ data: null, loading: false, error }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
