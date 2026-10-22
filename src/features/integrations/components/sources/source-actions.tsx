"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";

import { connectionsService } from "../../connections.service";
import type { IdentitySyncResult } from "../../contracts/connections";
import { usePagedRun } from "../../hooks/use-paged-run";
import type { ConnectorDef } from "../../types/connectors";
import {
  EMPTY_SYNC,
  madeProgress,
  mergeSync,
  nextSyncBody,
} from "../../utils/connections";
import { RunProgress } from "../connect/run-progress";

/** What a connected source does next, for the ones with nothing to run. */
const AFTER_CONNECT: Record<string, string> = {
  magic:
    "Sign-ins arrive through the SDK. Install it in your app and new wallets appear as people log in.",
  reown:
    "Sessions arrive through the SDK. Install it in your app and connected wallets appear as they connect.",
  thirdweb:
    "In-app wallets arrive through the SDK. Install it in your app and they appear as people sign in.",
  web3auth:
    "Logins arrive through the SDK. Install it in your app and wallets appear as people sign in.",
  posthog:
    "Verified and saved. Reading events from PostHog isn't switched on by the server yet; until then send them with the SDK.",
};

/**
 * The run controls for a connected source: a paged identity sync (Privy,
 * Clerk, Dynamic, which also re-sync every 6 hours on their own), a one-call
 * pull for a Dune query or a sheet, or a note on how data arrives.
 */
export function SourceActions({ def }: { def: ConnectorDef }) {
  if (def.action === "identity-sync") return <IdentitySync def={def} />;
  if (def.action === "data-sync") return <DataSync def={def} />;
  const note = AFTER_CONNECT[def.id];
  return note ? <p className="text-sm text-muted-foreground">{note}</p> : null;
}

function IdentitySync({ def }: { def: ConnectorDef }) {
  const qc = useQueryClient();
  const run = usePagedRun<IdentitySyncResult>({
    step: (body, signal) =>
      connectionsService.syncIdentity(def.route ?? def.id, body, signal),
    next: nextSyncBody,
    merge: mergeSync,
    empty: EMPTY_SYNC,
    progressed: madeProgress,
  });
  const t = run.totals;

  const start = async () => {
    await run.start();
    qc.invalidateQueries({ queryKey: ["audience"] });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        New {def.label} users sync every 6 hours. Sync now to pull everyone in
        straight away.
      </p>
      {run.status !== "running" ? (
        <Button size="sm" onClick={start}>
          <ArrowPathIcon aria-hidden="true" className="mr-1.5 size-4" />
          {run.status === "idle" ? "Sync now" : "Sync again"}
        </Button>
      ) : null}
      {t ? (
        <RunProgress
          status={run.status}
          running={`Reading users from ${def.label}…`}
          done={
            run.capped
              ? "Paused after a long run. Sync again to carry on."
              : "Up to date."
          }
          error={run.error}
          onStop={run.stop}
          stats={[
            { label: "Read", value: t.scanned },
            { label: "New contacts", value: t.created },
            { label: "Already here", value: t.alreadySynced },
            { label: "Skipped", value: t.skipped },
          ]}
          notes={[
            ...(t.truncatedAtCap
              ? [
                  "Dynamic's API stops at 10,000 users. The rest arrive as they sign in.",
                ]
              : []),
            ...(t.warnings ?? []),
          ]}
        />
      ) : null}
    </div>
  );
}

function DataSync({ def }: { def: ConnectorDef }) {
  const qc = useQueryClient();
  const sync = useMutation({
    mutationFn: () => connectionsService.syncData(def.route ?? def.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audience"] }),
  });
  const r = sync.data;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Pull the rows in as contacts. Up to 10,000 rows and 50 columns; rows
        already here are matched, not duplicated.
      </p>
      <Button size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
        <ArrowPathIcon
          aria-hidden="true"
          className={`mr-1.5 size-4 ${sync.isPending ? "animate-spin" : ""}`}
        />
        {sync.isPending ? "Syncing…" : r ? "Sync again" : "Sync now"}
      </Button>
      {sync.isError || r ? (
        <RunProgress
          status={sync.isError ? "error" : "done"}
          running=""
          done="Synced."
          error={sync.error?.message ?? null}
          stats={
            r
              ? [
                  { label: "Rows", value: r.rows },
                  { label: "New contacts", value: r.created },
                  { label: "Already here", value: r.alreadySynced },
                  { label: "Skipped", value: r.skipped },
                ]
              : []
          }
        />
      ) : null}
    </div>
  );
}
