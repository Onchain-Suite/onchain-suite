"use client";

import { ArrowDataTransferHorizontalIcon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

import { useConnectorRun } from "../../hooks/use-connector-run";
import type { ConnectorDef } from "../../types/connectors";
import {
  isRunLive,
  migrationTotals,
  runPanelStatus,
  runStartLabel,
} from "../../utils/runs";
import { MigrationSummary } from "./migration-summary";
import { Icon } from "@/shared/components/common/hugeicon";

const VERBS = { start: "Start migration", again: "Run again" };

/**
 * A migration that runs on the server. Starting it answers at once; the
 * numbers below are the server's own, read every few seconds while it runs.
 * Closing this, or the tab, does not stop it. Stop does, after the batch in
 * progress, and the run keeps its place so Continue picks up from there.
 *
 * `fallback` renders when this server has no background runs yet.
 */
export function BackgroundMigration({
  def,
  consent,
  agreed,
  fallback,
}: {
  def: ConnectorDef;
  consent: ReactNode;
  agreed: boolean;
  fallback: ReactNode;
}) {
  const qc = useQueryClient();
  const r = useConnectorRun(def.id);
  const state = r.run?.state;

  // New contacts and lists exist once a run ends, however it ended.
  const wasLive = useRef(false);
  useEffect(() => {
    const live = isRunLive(r.run);
    if (wasLive.current && !live) {
      qc.invalidateQueries({ queryKey: ["audience"] });
      qc.invalidateQueries({ queryKey: ["lists"] });
    }
    wasLive.current = live;
  }, [r.run, qc]);

  if (r.unavailable) return <>{fallback}</>;
  if (r.isLoading) {
    return (
      <div
        className="h-9 w-40 animate-pulse rounded-md bg-muted"
        aria-hidden="true"
      />
    );
  }

  const live = isRunLive(r.run);
  const shown = state && state !== "idle";
  return (
    <div className="space-y-3">
      {!live ? consent : null}
      {!live ? (
        <Button
          size="sm"
          onClick={() => r.start({})}
          disabled={!agreed || r.isStarting}
        >
          <Icon
            icon={ArrowDataTransferHorizontalIcon}
            className="mr-1.5 size-4"
          />
          {runStartLabel(r.run, VERBS)}
        </Button>
      ) : null}
      {r.run?.resumable ? (
        <p className="text-xs text-muted-foreground">
          Continue carries on from where it stopped.{" "}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
            onClick={() => r.start({ restart: true })}
            disabled={!agreed || r.isStarting}
          >
            Start over instead
          </button>
        </p>
      ) : null}
      {r.actionError ? (
        <p className="text-xs text-destructive">{r.actionError}</p>
      ) : null}
      {shown && r.run ? (
        <MigrationSummary
          label={def.label}
          status={runPanelStatus(r.run)}
          totals={migrationTotals(r.run.totals)}
          error={r.run.error}
          incomplete={r.run.incomplete}
          background
          stopping={r.isStopping}
          onStop={() => r.stop()}
        />
      ) : null}
    </div>
  );
}
