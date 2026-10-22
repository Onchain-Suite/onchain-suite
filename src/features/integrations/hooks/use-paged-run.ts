"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ConnectionsError } from "../connections.service";

/**
 * Drives a server operation that works in bounded slices (a migration, an
 * identity sync): call, add to the totals, ask for the next slice, repeat.
 * Every call can be stopped, a slice that reads nothing ends the run, and the
 * number of rounds is capped so nothing loops forever.
 */

export type RunStatus = "idle" | "running" | "done" | "stopped" | "error";

export interface PagedRunState<R> {
  status: RunStatus;
  totals: R | null;
  rounds: number;
  error: string | null;
  /** Stopped at the round cap with more still to read. */
  capped: boolean;
}

export interface PagedRunConfig<R> {
  step: (body: Record<string, unknown>, signal: AbortSignal) => Promise<R>;
  /** The next body, or null when finished. Called with null for the first. */
  next: (prev: R | null) => Record<string, unknown> | null;
  merge: (acc: R, r: R) => R;
  empty: R;
  progressed: (r: R) => boolean;
  maxRounds?: number;
}

const IDLE = {
  status: "idle",
  totals: null,
  rounds: 0,
  error: null,
  capped: false,
} as const;

export function usePagedRun<R>(config: PagedRunConfig<R>) {
  const [state, setState] = useState<PagedRunState<R>>(IDLE);
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback(async () => {
    const {
      step,
      next,
      merge,
      empty,
      progressed,
      maxRounds = 200,
    } = configRef.current;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let acc = empty;
    let prev: R | null = null;
    let rounds = 0;
    setState({ ...IDLE, status: "running", totals: empty });

    try {
      while (rounds < maxRounds) {
        const body = next(prev);
        if (!body) break;
        const r = await step(body, ctrl.signal);
        rounds += 1;
        acc = merge(acc, r);
        prev = r;
        setState({ ...IDLE, status: "running", totals: acc, rounds });
        if (!progressed(r)) break;
      }
      const capped = rounds >= maxRounds && next(prev) !== null;
      setState({ ...IDLE, status: "done", totals: acc, rounds, capped });
    } catch (e) {
      const stopped =
        ctrl.signal.aborted ||
        (e instanceof ConnectionsError && e.code === "CANCELED");
      setState({
        ...IDLE,
        status: stopped ? "stopped" : "error",
        totals: acc,
        rounds,
        error: stopped ? null : e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(IDLE);
  }, []);

  return { ...state, start, stop, reset };
}
