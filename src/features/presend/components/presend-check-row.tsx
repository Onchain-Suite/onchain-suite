"use client";

import {
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

import type { PresendCheck } from "../contracts/presend";
import { presendCopy } from "../utils/presend-copy";
import { stepsOf } from "../utils/presend-errors";

/** What a step the builder can't name is called (deleted, or not loaded). */
export const UNKNOWN_STEP_NAME = "Email step";

interface CheckRowProps {
  check: PresendCheck;
  isNew?: boolean;
  stepName?: (nodeId: string) => string | undefined;
  onGoToStep?: (nodeId: string) => void;
}

/**
 * Which Send Email steps an automation check applies to. A step the page can
 * name gets a "Go to step"; one it can't is still listed (as "Email step") so
 * the count is honest, but has nowhere to go.
 */
function CheckSteps({
  nodeIds,
  stepName,
  onGoToStep,
}: {
  nodeIds: string[];
  stepName?: CheckRowProps["stepName"];
  onGoToStep?: CheckRowProps["onGoToStep"];
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">
        {nodeIds.length === 1 ? "Email step" : `${nodeIds.length} email steps`}
      </p>
      <ul className="flex flex-wrap gap-2">
        {nodeIds.map((nodeId) => {
          const raw = stepName?.(nodeId)?.trim();
          const name = raw && raw.length > 0 ? raw : undefined;
          return (
            <li
              key={nodeId}
              data-testid={`presend-step-${nodeId}`}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <span className="text-foreground">
                {name ?? UNKNOWN_STEP_NAME}
              </span>
              {name && onGoToStep ? (
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  aria-label={`Go to step ${name}`}
                  onClick={() => onGoToStep(nodeId)}
                >
                  Go to step
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One warn or block in the pre-send review, with the backend's copy. */
export function CheckRow({
  check,
  isNew,
  stepName,
  onGoToStep,
}: CheckRowProps) {
  const copy = presendCopy(check.code);
  const isBlock = check.outcome === "block";
  const Icon = isBlock ? XCircleIcon : ExclamationTriangleIcon;
  const nodeIds = stepsOf(check);
  return (
    <li
      data-testid={`presend-${check.outcome}-${check.code}`}
      className={
        isBlock
          ? "rounded-md border border-destructive/30 bg-destructive/5 p-3"
          : "rounded-md border border-amber-500/40 bg-amber-500/10 p-3"
      }
    >
      <div className="flex items-start gap-2">
        <Icon
          aria-hidden="true"
          className={
            isBlock
              ? "mt-0.5 size-4 shrink-0 text-destructive"
              : "mt-0.5 size-4 shrink-0 text-amber-600"
          }
        />
        <div className="min-w-0 space-y-1 text-sm">
          <p className="font-medium text-foreground">
            {copy.title}
            {isNew ? (
              <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600">
                New
              </span>
            ) : null}
          </p>
          {check.message ? (
            <p className="text-muted-foreground">{check.message}</p>
          ) : null}
          {check.fix ? (
            <p className="text-foreground">
              <span className="font-medium">Fix: </span>
              {check.fix}
            </p>
          ) : null}
          {nodeIds.length > 0 ? (
            <CheckSteps
              nodeIds={nodeIds}
              stepName={stepName}
              onGoToStep={onGoToStep}
            />
          ) : null}
          {copy.href ? (
            <Link
              href={copy.href}
              className="inline-block text-primary underline-offset-4 hover:underline"
            >
              {copy.linkLabel ?? "Open settings"}
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}
