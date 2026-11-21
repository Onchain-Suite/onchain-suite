"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useState } from "react";

import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Label } from "@/ui/label";

import type { PresendCheck } from "../contracts/presend";
import { presendCopy } from "../utils/presend-copy";
import { CheckRow } from "./presend-check-row";

export type PresendAction = "send" | "activate" | "save";

export interface PresendDialogProps {
  open: boolean;
  /** The check is still running. */
  loading?: boolean;
  checks: PresendCheck[];
  /** Which verb the primary button uses: Send / Activate / Save anyway. */
  action: PresendAction;
  /**
   * Warn codes that appeared after the user had already confirmed (a partial
   * or stale acknowledgement came back 409). Marked "New" so the second
   * review is not a blind re-click.
   */
  newCodes?: string[];
  /** Other validation errors a 422 carried next to the blocks. */
  otherErrors?: string[];
  onConfirm: () => void;
  onCancel: () => void;
  /** Automation only: a Send Email step's name, undefined when not found. */
  stepName?: (nodeId: string) => string | undefined;
  /** Automation only: close the review and focus that step. */
  onGoToStep?: (nodeId: string) => void;
}

const ACTION_LABEL: Record<PresendAction, string> = {
  send: "Send anyway",
  activate: "Activate anyway",
  save: "Save anyway",
};

const ACTION_NOUN: Record<PresendAction, string> = {
  send: "Sending",
  activate: "Activating",
  save: "Saving",
};

/**
 * Pre-send review: blocks first (nothing can override them), then warnings
 * behind one explicit confirmation, then passes collapsed to a count. Checks
 * the backend could not run (`details.skipped`) are named quietly; they passed
 * without evidence, so they are neither green nor alarming.
 *
 * All explanation text is the backend's `message`/`fix`; this component only
 * adds a title and a link per code.
 */
export function PresendDialog({
  open,
  loading = false,
  checks,
  action,
  newCodes = [],
  otherErrors = [],
  onConfirm,
  onCancel,
  stepName,
  onGoToStep,
}: PresendDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [showPassed, setShowPassed] = useState(false);
  const ackId = useId();

  // A fresh set of checks is a fresh review: never carry a tick over.
  useEffect(() => {
    setAcknowledged(false);
    setShowPassed(false);
  }, [checks, open]);

  const blocks = checks.filter((c) => c.outcome === "block");
  const warns = checks.filter((c) => c.outcome === "warn");
  const passes = checks.filter((c) => c.outcome === "pass");
  const skipped = passes.filter(
    (c) => typeof c.details?.skipped === "string" && c.details.skipped
  );
  const passed = passes.filter((c) => !skipped.includes(c));
  const isBlocked = blocks.length > 0;
  const newSet = new Set(newCodes);

  const title = loading
    ? "Running pre-send checks"
    : isBlocked
      ? "Fix these before continuing"
      : "Review before continuing";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {loading
              ? "Checking the sender's DNS, the content and the audience."
              : isBlocked
                ? `${ACTION_NOUN[action]} can't continue until ${
                    blocks.length === 1 ? "this is fixed" : "these are fixed"
                  }.`
                : "These won't stop the send, but they hurt deliverability or trust."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div
            role="status"
            className="py-6 text-center text-sm text-muted-foreground"
          >
            Checking…
          </div>
        ) : (
          <div className="space-y-4">
            {blocks.length > 0 ? (
              <section aria-label="Blocking issues" className="space-y-2">
                <h3 className="text-sm font-semibold text-destructive">
                  {blocks.length === 1
                    ? "1 issue blocks this"
                    : `${blocks.length} issues block this`}
                </h3>
                <ul className="space-y-2">
                  {blocks.map((c) => (
                    <CheckRow
                      key={c.code}
                      check={c}
                      stepName={stepName}
                      onGoToStep={onGoToStep}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {otherErrors.length > 0 ? (
              <section aria-label="Other issues" className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Also needs fixing
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {otherErrors.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {warns.length > 0 ? (
              <section aria-label="Warnings" className="space-y-2">
                <h3 className="text-sm font-semibold text-amber-600">
                  {warns.length === 1
                    ? "1 warning"
                    : `${warns.length} warnings`}
                </h3>
                <ul className="space-y-2">
                  {warns.map((c) => (
                    <CheckRow
                      key={c.code}
                      check={c}
                      isNew={newSet.has(c.code)}
                      stepName={stepName}
                      onGoToStep={onGoToStep}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {passed.length > 0 ? (
              <section aria-label="Passed checks">
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  aria-expanded={showPassed}
                  onClick={() => setShowPassed((v) => !v)}
                >
                  <CheckCircleIcon aria-hidden="true" className="size-4" />
                  {passed.length === 1
                    ? "1 check passed"
                    : `${passed.length} checks passed`}
                </button>
                {showPassed ? (
                  <ul className="mt-2 space-y-1 pl-5 text-sm text-muted-foreground">
                    {passed.map((c) => (
                      <li key={c.code}>{presendCopy(c.code).title}: passed</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {skipped.length > 0 ? (
              <ul
                aria-label="Checks that could not run"
                className="space-y-1 text-xs text-muted-foreground"
              >
                {skipped.map((c) => (
                  <li key={c.code}>
                    Couldn&apos;t check{" "}
                    {presendCopy(c.code).title.toLowerCase()}. The check is not
                    counted against you.
                  </li>
                ))}
              </ul>
            ) : null}

            {!isBlocked && warns.length > 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-border p-3">
                <Checkbox
                  id={ackId}
                  checked={acknowledged}
                  onCheckedChange={(v) => setAcknowledged(v === true)}
                  aria-label="I've read these warnings"
                />
                <Label htmlFor={ackId} className="text-sm leading-snug">
                  I&apos;ve read these warnings and want to continue.
                </Label>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {isBlocked ? "Go back" : "Cancel"}
          </Button>
          {!loading && !isBlocked && warns.length > 0 ? (
            <Button type="button" disabled={!acknowledged} onClick={onConfirm}>
              {ACTION_LABEL[action]}
            </Button>
          ) : null}
          {isBlocked ? (
            <Button type="button" disabled>
              {ACTION_LABEL[action]}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
