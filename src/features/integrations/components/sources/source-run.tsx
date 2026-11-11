"use client";

import { ArrowReloadHorizontalIcon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

import { useConnectorRun } from "../../hooks/use-connector-run";
import type { ConnectorDef } from "../../types/connectors";
import {
  isRunLive,
  runPanelStatus,
  runStartLabel,
  syncTotals,
} from "../../utils/runs";
import { RunProgress } from "../connect/run-progress";
import { Icon } from "@/shared/components/common/hugeicon";

const VERBS = { start: "Sync now", again: "Sync again" };

/**
 * A source sync that runs on the server: users from Privy, rows from a Dune
 * query, wallets from a subgraph. Starting it answers at once and the numbers
 * are the server's own, read every few seconds while it runs. Closing this
 * does not stop it; Stop does, and Continue picks up from there.
 *
 * `fallback` renders when this server has no background runs yet.
 */
export function SourceRun({
  def,
  intro,
  fallback,
}: {
  def: ConnectorDef;
  /** What this sync does, in a sentence. */
  intro: string;
  fallback: ReactNode;
}) {
  const qc = useQueryClient();
  const r = useConnectorRun(def.id);

  const wasLive = useRef(false);
  useEffect(() => {
    const live = isRunLive(r.run);
    if (wasLive.current && !live) {
      qc.invalidateQueries({ queryKey: ["audience"] });
    }
    wasLive.current = live;
  }, [r.run, qc]);

  if (r.unavailable) return <>{fallback}</>;

  const live = isRunLive(r.run);
  const t = syncTotals(r.run?.totals ?? {});
  const shown = r.run && r.run.state !== "idle";
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{intro}</p>
      {r.isLoading ? (
        <div
          className="h-9 w-28 animate-pulse rounded-md bg-muted"
          aria-hidden="true"
        />
      ) : !live ? (
        <Button size="sm" onClick={() => r.start({})} disabled={r.isStarting}>
          <Icon icon={ArrowReloadHorizontalIcon} className="mr-1.5 size-4" />
          {runStartLabel(r.run, VERBS)}
        </Button>
      ) : null}
      {r.actionError ? (
        <p className="text-xs text-destructive">{r.actionError}</p>
      ) : null}
      {shown && r.run ? (
        <RunProgress
          status={runPanelStatus(r.run)}
          running={
            r.isStopping
              ? "Stopping after this batch…"
              : `Reading from ${def.label}. You can close this; it carries on.`
          }
          done="Up to date."
          error={r.run.error}
          onStop={r.isStopping ? undefined : () => r.stop()}
          stats={[
            { label: "Read", value: t.read },
            { label: "New contacts", value: t.created },
            { label: "Already here", value: t.alreadySynced },
            { label: "Skipped", value: t.skipped },
          ]}
          notes={[
            ...(r.run.incomplete
              ? [
                  `${def.label} had more than it would hand over in one go. Sync again to pick up the rest.`,
                ]
              : []),
            ...t.warnings,
          ]}
        />
      ) : null}
    </div>
  );
}
