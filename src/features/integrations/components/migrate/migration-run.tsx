"use client";

import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

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
import { BackgroundMigration } from "./background-migration";
import { ExportRun } from "./export-run";
import { MigrationSummary } from "./migration-summary";
import { ConsentDeclarationFields } from "@/features/audience/components/consent/consent-declaration-fields";
import type { ImportConsentDeclaration } from "@/features/audience/contracts/consent";
import {
  type ConsentDraft,
  consentDraftError,
  EMPTY_CONSENT_DRAFT,
  toConsentDeclaration,
} from "@/features/audience/utils/consent";

/**
 * Start a migration once the tool is connected. The person declares how these
 * contacts opted in (recorded per contact); the server still applies consent
 * itself (only confirmed, subscribed people come across, the rest are counted
 * as held) and sends nobody anything.
 */
export function MigrationRun({ def }: { def: ConnectorDef }) {
  const [draft, setDraft] = useState<ConsentDraft>(EMPTY_CONSENT_DRAFT);
  const draftError = consentDraftError(draft);
  const agreed = draftError === null;
  // beehiiv, Klaviyo and Mailchimp refuse a migration without this
  // (backend 2026-11-22); every other tool records it when it can.
  const declaration = agreed ? toConsentDeclaration(draft) : undefined;

  const consent = (
    <ConsentDeclarationFields
      value={draft}
      onChange={setDraft}
      error={draft.source ? draftError : null}
      showRowDateNote={false}
    />
  );

  if (def.action === "migrate-async") {
    return (
      <ExportRun
        def={def}
        consent={consent}
        agreed={agreed}
        declaration={declaration}
      />
    );
  }
  return (
    <BackgroundMigration
      def={def}
      consent={consent}
      agreed={agreed}
      declaration={declaration}
      fallback={
        <PagedMigration
          def={def}
          consent={consent}
          agreed={agreed}
          declaration={declaration}
        />
      }
    />
  );
}

/**
 * The migration looped from this tab, one slice per request. Only for a
 * server that has no background runs yet: it stops when the tab closes, and a
 * slice has to finish inside one request. Remove once every backend has runs.
 */
function PagedMigration({
  def,
  consent,
  agreed,
  declaration,
}: {
  def: ConnectorDef;
  consent: ReactNode;
  agreed: boolean;
  declaration?: ImportConsentDeclaration;
}) {
  const qc = useQueryClient();
  const run = usePagedRun<MigrationResult>({
    step: (body, signal) =>
      connectionsService.migrate(
        def.id,
        declaration ? { ...body, consent: declaration } : body,
        signal
      ),
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
