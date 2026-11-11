"use client";

import { ArrowDataTransferHorizontalIcon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { connectorRunsService } from "../../connector-runs.service";
import type { IterableJobStatus } from "../../contracts/connections";
import type { RunStatus } from "../../hooks/use-paged-run";
import type { ConnectorDef } from "../../types/connectors";
import { EMPTY_MIGRATION } from "../../utils/connections";
import { MigrationSummary } from "./migration-summary";
import { Icon } from "@/shared/components/common/hugeicon";

const POLL_MS = 5_000;
/** Stop watching after an hour; the job carries on server-side regardless. */
const MAX_POLLS = 720;

/**
 * Braze, Customer.io and Iterable hand an audience over as one export, so the
 * migration is a background job: start it, then poll its state. Starting
 * while one is running rejoins it. Stop only stops watching; the export itself
 * keeps going.
 */
export function ExportRun({
  def,
  consent,
  agreed,
}: {
  def: ConnectorDef;
  consent: ReactNode;
  agreed: boolean;
}) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<RunStatus>("idle");
  const [job, setJob] = useState<IterableJobStatus | null>(null);
  const [listName, setListName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("running");
    setError(null);
    setJob(null);
    try {
      const started = await connectorRunsService.startExport(def.id);
      setListName(started.listName);
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, POLL_MS);
          ctrl.signal.addEventListener("abort", () => {
            clearTimeout(t);
            reject(new DOMException("Stopped", "AbortError"));
          });
        });
        const s = await connectorRunsService.exportStatus(
          def.id,
          started.jobId,
          ctrl.signal
        );
        setJob(s);
        if (s.state === "completed") {
          setStatus("done");
          qc.invalidateQueries({ queryKey: ["audience"] });
          return;
        }
        if (s.state === "failed") {
          setStatus("error");
          setError(s.failedReason ?? `${def.label}'s export failed.`);
          return;
        }
      }
      setStatus("stopped");
    } catch (e) {
      if (ctrl.signal.aborted) {
        setStatus("stopped");
        return;
      }
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [qc, def.id, def.label]);

  const result = job?.result;
  const waiting = job ? job.state : "queued";

  return (
    <div className="space-y-3">
      {status === "idle" ? consent : null}
      {status !== "running" ? (
        <Button size="sm" onClick={start} disabled={!agreed}>
          <Icon
            icon={ArrowDataTransferHorizontalIcon}
            className="mr-1.5 size-4"
          />
          {status === "idle"
            ? "Start migration"
            : status === "done"
              ? "Run again"
              : "Check again"}
        </Button>
      ) : null}
      {status === "running" && !result ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground">
          <span className="min-w-0 flex-1">
            {def.label} is exporting your contacts ({waiting}). This can take a
            while; you can close this and come back.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => abortRef.current?.abort()}
          >
            Stop watching
          </Button>
        </div>
      ) : null}
      {status === "stopped" && !result ? (
        <p className="text-sm text-muted-foreground">
          Stopped watching. The export carries on; check again any time.
        </p>
      ) : null}
      {result || status === "error" ? (
        <MigrationSummary
          label={def.label}
          status={status}
          totals={result ?? { ...EMPTY_MIGRATION, listName }}
          error={error}
        />
      ) : null}
    </div>
  );
}
