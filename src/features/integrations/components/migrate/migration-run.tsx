"use client";

import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { connectionsService } from "../../connections.service";
import type { MigrationResult } from "../../contracts/connections";
import { usePagedRun } from "../../hooks/use-paged-run";
import type { ConnectorDef } from "../../types/connectors";
import {
  EMPTY_MIGRATION,
  madeProgress,
  mergeMigration,
  nextMigrationBody,
} from "../../utils/connections";
import { IterableRun } from "./iterable-run";
import { MigrationSummary } from "./migration-summary";

/**
 * Start a migration once the tool is connected. The person confirms they may
 * message these contacts; the server still applies consent itself (only
 * confirmed, subscribed people come across, the rest are counted as held) and
 * sends nobody anything.
 */
export function MigrationRun({ def }: { def: ConnectorDef }) {
  const id = useId();
  const [agreed, setAgreed] = useState(false);

  const consent = (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        checked={agreed}
        onCheckedChange={(v) => setAgreed(v === true)}
        className="mt-0.5"
      />
      <Label htmlFor={id} className="text-sm font-normal leading-snug">
        These contacts agreed to hear from us, and I may move them to
        OnchainSuite.
      </Label>
    </div>
  );

  return def.action === "migrate-async" ? (
    <IterableRun consent={consent} agreed={agreed} />
  ) : (
    <PagedMigration def={def} consent={consent} agreed={agreed} />
  );
}

function PagedMigration({
  def,
  consent,
  agreed,
}: {
  def: ConnectorDef;
  consent: ReactNode;
  agreed: boolean;
}) {
  const qc = useQueryClient();
  const run = usePagedRun<MigrationResult>({
    step: (body, signal) => connectionsService.migrate(def.id, body, signal),
    next: (prev) => nextMigrationBody(def.paging ?? "cursor", prev),
    merge: mergeMigration,
    empty: EMPTY_MIGRATION,
    progressed: madeProgress,
  });

  const start = async () => {
    await run.start();
    qc.invalidateQueries({ queryKey: ["audience"] });
    qc.invalidateQueries({ queryKey: ["lists"] });
  };

  const t = run.totals;
  return (
    <div className="space-y-3">
      {run.status === "idle" ? consent : null}
      {run.status !== "running" ? (
        <Button size="sm" onClick={start} disabled={!agreed}>
          <ArrowsRightLeftIcon aria-hidden="true" className="mr-1.5 size-4" />
          {run.status === "idle" ? "Start migration" : "Run again"}
        </Button>
      ) : null}
      {t ? (
        <MigrationSummary
          label={def.label}
          status={run.status}
          totals={t}
          error={run.error}
          capped={run.capped}
          onStop={run.stop}
        />
      ) : null}
    </div>
  );
}
