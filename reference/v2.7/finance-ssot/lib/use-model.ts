'use client';
// The hook every page reads the model through. Returns the inputs, everything derived
// from them, and a formatter already bound to the reader's currency.
import * as React from 'react';
import { getServerSnapshot, getSnapshot, hydrate, subscribe, format, type Ccy } from '@/lib/store';

export function useModel() {
  const snap = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // The server renders the agreed baseline so the markup matches on both sides; a saved
  // scenario is read in afterwards, which is a change of state rather than a hydration
  // mismatch.
  React.useEffect(() => { hydrate(); }, []);

  const f = React.useCallback(
    (v: unknown, fmtCode?: string, ccy?: Ccy) => format(v, fmtCode, ccy ?? snap.ccy),
    [snap.ccy],
  );

  return { s: snap.s, d: snap.d, ccy: snap.ccy, scenario: snap.scenario, dirty: snap.dirty, f };
}
