"use client";

import {
  CheckCircleIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/ui/button";

import { cn, isJsonObject } from "@/lib/utils";

import {
  type IntelligenceProposedAction,
  intelligenceService,
} from "@/features/intelligence/intelligence.service";

/**
 * Renders a confirm-gated action the agent PROPOSED but did not run, with an
 * explicit approve / decline step. This is the frontend half of the backend's
 * "act only with explicit permission" contract: the agent returns a
 * `proposed_action` (a plan, not an effect); the human approves; only then do we
 * execute the exact approved args with `confirm: true` via `runIntelligenceTool`
 * - no second LLM round trip, so what runs is precisely what was shown.
 */

type Phase = "idle" | "running" | "done" | "error";

/** Human label for a tool name, so the card does not surface raw snake_case. */
const TOOL_LABELS: Record<string, string> = {
  apply_play: "Create automation from Play",
  create_campaign_from_segment: "Create campaign for segment",
};

const toolLabel = (tool: string): string =>
  TOOL_LABELS[tool] ??
  tool.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Compact, readable rendering of one approved argument value. */
const formatArgValue = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? "-" : `${value.length} item(s)`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/** Human label for an argument key. */
const argLabel = (key: string): string =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

/** A short confirmation line drawn from whatever the executed tool returned. */
const successLine = (result: Record<string, unknown>): string => {
  const created = isJsonObject(result.automation)
    ? result.automation
    : isJsonObject(result.segment)
      ? result.segment
      : isJsonObject(result.campaign)
        ? result.campaign
        : null;
  const name =
    created && typeof created.name === "string" ? created.name : null;
  if (name) return `Created "${name}" as a draft. Nothing has been sent yet.`;
  return "Done. It was created as a draft - nothing has been sent yet.";
};

export function ProposedActionCard({
  action,
}: {
  action: IntelligenceProposedAction;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const argEntries = Object.entries(action.args ?? {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );

  const approve = async () => {
    setPhase("running");
    setMessage(null);
    try {
      const result = await intelligenceService.runIntelligenceTool({
        tool: action.tool,
        // The approved args, plus the confirm flag the gate requires.
        args: { ...action.args, confirm: true },
      });
      // A guard: if the backend still returns a proposal, confirm did not take.
      if (isJsonObject(result) && result.proposed === true) {
        throw new Error("The action was not confirmed. Please try again.");
      }
      setPhase("done");
      setMessage(successLine(result));
      toast.success("Action completed");
    } catch (err) {
      setPhase("error");
      const text =
        err instanceof Error ? err.message : "Could not complete the action.";
      setMessage(text);
      toast.error(text);
    }
  };

  const decline = () => {
    setPhase("done");
    setMessage("Declined. Nothing was changed.");
  };

  const declined = phase === "done" && message?.startsWith("Declined");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card",
        phase === "done" && !declined
          ? "border-emerald-500/40"
          : phase === "error"
            ? "border-destructive/50"
            : "border-amber-500/40"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/30 px-4 py-2.5">
        <ShieldCheckIcon
          className="h-4 w-4 shrink-0 text-amber-500"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-foreground">
          Needs your approval
        </span>
        <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {toolLabel(action.tool)}
        </span>
      </div>

      <div className="space-y-4 p-4">
        {/* What the agent will do */}
        <p className="text-sm text-foreground">{action.summary}</p>

        {/* Exactly what will run */}
        {argEntries.length > 0 ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 text-sm">
            {argEntries.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-muted-foreground">{argLabel(key)}</dt>
                <dd className="min-w-0 break-words font-medium text-foreground">
                  {formatArgValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {/* Result / status line */}
        {message ? (
          <div
            className={cn(
              "flex items-start gap-2 text-sm",
              phase === "error"
                ? "text-destructive"
                : declined
                  ? "text-muted-foreground"
                  : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {phase === "done" && !declined ? (
              <CheckCircleIcon
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            ) : phase === "error" ? (
              <XMarkIcon
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            ) : null}
            <span>{message}</span>
          </div>
        ) : null}

        {/* Controls: hidden once the action is resolved (done/declined) */}
        {phase !== "done" ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={approve}
              disabled={phase === "running"}
            >
              {phase === "running"
                ? "Working…"
                : phase === "error"
                  ? "Try again"
                  : "Approve & run"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={decline}
              disabled={phase === "running"}
            >
              Decline
            </Button>
            <span className="ml-1 text-xs text-muted-foreground">
              Nothing runs until you approve.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ProposedActionCard;
