"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type {
  PresendAction,
  PresendDialogProps,
} from "../components/presend-dialog";
import type { PresendCheck, PresendResult } from "../contracts/presend";
import {
  hasWarns,
  parsePresendError,
  PresendStoppedError,
  warnCodesOf,
} from "../utils/presend-errors";

export interface PresendRunOptions<T> {
  /**
   * The gated request. Called with `undefined` before anything is known, then
   * with every warn code currently shown once the user confirmed. Its response
   * is authoritative: a 409/422 here re-opens the dialog whatever the
   * preflight said.
   */
  attempt: (acknowledgedWarnings: string[] | undefined) => Promise<T>;
  /**
   * Optional early look (`GET /campaigns/:id/presend-check`). A failure here
   * never stops the action: the attempt runs and the backend decides.
   */
  preflight?: () => Promise<PresendResult | null | undefined>;
  action: PresendAction;
  /**
   * Validation errors already known to sit beside a preflight block (e.g.
   * `POST /campaigns/{id}/validate`'s non-presend `errors`), shown with it.
   */
  otherErrors?: string[];
  /** Automation only: how to name and reach the Send Email steps a check names. */
  steps?: PresendSteps;
}

export interface PresendSteps {
  /** The step's name in the builder, or undefined when it is not on the graph. */
  nameOf?: (nodeId: string) => string | undefined;
  /** Close the review and bring this step into view. */
  onGoTo?: (nodeId: string) => void;
}

interface DialogState {
  loading: boolean;
  checks: PresendCheck[];
  newCodes: string[];
  otherErrors: string[];
  action: PresendAction;
  steps?: PresendSteps;
}

/** Re-asks are bounded: a backend that 409s forever must not loop forever. */
const MAX_ROUNDS = 4;

/**
 * Wraps a launch / activate / save in the pre-send acknowledgement flow.
 *
 * `run` resolves with the attempt's value, rethrows any error that is not a
 * pre-send refusal, and throws {@link PresendStoppedError} when a block
 * stopped it or the user cancelled - callers treat that as "nothing happened"
 * (no toast, no optimistic state).
 *
 * Render `<PresendDialog {...gate.dialogProps} />` once next to the trigger.
 */
export function usePresendGate() {
  const [state, setState] = useState<DialogState | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);
  // Closing the dialog while the preflight is still loading cancels the run.
  const cancelledWhileLoading = useRef(false);

  const settle = useCallback((confirmed: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setState(null);
    if (resolve) resolve(confirmed);
    else if (!confirmed) cancelledWhileLoading.current = true;
  }, []);

  const ask = useCallback(
    (next: Omit<DialogState, "loading">) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setState({ ...next, loading: false });
      }),
    []
  );

  const run = useCallback(
    async <T>(options: PresendRunOptions<T>): Promise<T> => {
      const { attempt, preflight, action, steps } = options;
      let ack: string[] | undefined;

      if (preflight) {
        cancelledWhileLoading.current = false;
        setState({
          loading: true,
          checks: [],
          newCodes: [],
          otherErrors: [],
          action,
          steps,
        });
        let result: PresendResult | null | undefined;
        try {
          result = await preflight();
        } catch {
          // The check endpoint failing is our problem, not the user's: fall
          // through to the attempt, which runs the same check server-side.
          result = null;
        }
        if (cancelledWhileLoading.current) {
          throw new PresendStoppedError("cancelled");
        }
        setState(null);
        if (result?.blocked) {
          await ask({
            checks: result.checks,
            newCodes: [],
            otherErrors: options.otherErrors ?? [],
            action,
            steps,
          });
          throw new PresendStoppedError("blocked");
        }
        if (result && hasWarns(result.checks)) {
          const confirmed = await ask({
            checks: result.checks,
            newCodes: [],
            otherErrors: [],
            action,
            steps,
          });
          if (!confirmed) throw new PresendStoppedError("cancelled");
          ack = warnCodesOf(result.checks);
        }
      }

      for (let round = 0; ; round += 1) {
        try {
          return await attempt(ack);
        } catch (error) {
          const refusal = parsePresendError(error);
          if (!refusal || round >= MAX_ROUNDS) throw error;
          if (refusal.kind === "blocked") {
            await ask({
              checks: refusal.checks,
              newCodes: [],
              otherErrors: refusal.otherErrors,
              action,
              steps,
            });
            throw new PresendStoppedError("blocked");
          }
          const previouslyAcked = new Set(ack ?? []);
          const confirmed = await ask({
            checks: refusal.checks,
            // Only meaningful when the user already confirmed once: these are
            // the warns that were not covered by that confirmation.
            newCodes: ack
              ? refusal.missing.filter((c) => !previouslyAcked.has(c))
              : [],
            otherErrors: [],
            action,
            steps,
          });
          if (!confirmed) throw new PresendStoppedError("cancelled");
          ack = refusal.warnCodes;
        }
      }
    },
    [ask]
  );

  const steps = state?.steps;
  const dialogProps: PresendDialogProps = useMemo(
    () => ({
      open: state !== null,
      loading: state?.loading ?? false,
      checks: state?.checks ?? [],
      action: state?.action ?? "send",
      newCodes: state?.newCodes ?? [],
      otherErrors: state?.otherErrors ?? [],
      onConfirm: () => settle(true),
      onCancel: () => settle(false),
      stepName: steps?.nameOf,
      // Going to a step abandons this review: the run stops as cancelled (or
      // blocked), then the builder focuses the step.
      onGoToStep: steps?.onGoTo
        ? (nodeId: string) => {
            settle(false);
            steps.onGoTo?.(nodeId);
          }
        : undefined,
    }),
    [settle, state, steps]
  );

  return { run, dialogProps };
}
