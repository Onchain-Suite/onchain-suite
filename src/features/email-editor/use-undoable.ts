import { useCallback, useReducer, useRef, useState } from "react";

/**
 * `useState` with a bounded undo/redo history. `set` is a drop-in for the React
 * setter (value or updater); every change that produces a new reference pushes
 * the previous value onto the past stack and clears the redo stack. Identity
 * updates (returning the same reference) are ignored so no-op commits don't
 * pollute history.
 */
export function useUndoable<T>(initial: T, limit = 100) {
  const [state, setStateRaw] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const [, force] = useReducer((c: number) => c + 1, 0);

  const set = useCallback(
    (update: T | ((prev: T) => T)) => {
      setStateRaw((prev) => {
        const next =
          typeof update === "function" ? (update as (p: T) => T)(prev) : update;
        if (next === prev) return prev;
        past.current.push(prev);
        if (past.current.length > limit) past.current.shift();
        future.current = [];
        return next;
      });
      force();
    },
    [limit]
  );

  const undo = useCallback(() => {
    setStateRaw((prev) => {
      const p = past.current.pop();
      if (p === undefined) return prev;
      future.current.push(prev);
      return p;
    });
    force();
  }, []);

  const redo = useCallback(() => {
    setStateRaw((prev) => {
      const f = future.current.pop();
      if (f === undefined) return prev;
      past.current.push(prev);
      return f;
    });
    force();
  }, []);

  /** Replace the value and wipe history (e.g. loading a fresh document). */
  const reset = useCallback((value: T) => {
    past.current = [];
    future.current = [];
    setStateRaw(value);
    force();
  }, []);

  return {
    state,
    set,
    undo,
    redo,
    reset,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
