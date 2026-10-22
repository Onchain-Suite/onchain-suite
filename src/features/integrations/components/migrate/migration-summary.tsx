"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

import type { MigrationResult } from "../../contracts/connections";
import type { RunStatus } from "../../hooks/use-paged-run";
import { heldTotal } from "../../utils/connections";
import { RunProgress } from "../connect/run-progress";

/** The tally of a migration, paged or async, and where the contacts went. */
export function MigrationSummary({
  label,
  status,
  totals: t,
  error,
  capped = false,
  onStop,
}: {
  label: string;
  status: RunStatus;
  totals: Pick<
    MigrationResult,
    "scanned" | "created" | "alreadyMigrated" | "held" | "skipped"
  > & { listName?: string; warnings?: string[] };
  error: string | null;
  capped?: boolean;
  onStop?: () => void;
}) {
  const held = heldTotal(t.held);
  const heldNote =
    held > 0
      ? `${held.toLocaleString("en-US")} held back: ${t.held.unsubscribed} unsubscribed, ${t.held.unconfirmed} unconfirmed, ${t.held.invalid} invalid, ${t.held.unreachable} unreachable.`
      : null;
  return (
    <div className="space-y-2">
      <RunProgress
        status={status}
        running={`Bringing contacts across from ${label}…`}
        done={
          capped
            ? "Paused after a long run. Run again to carry on from where it stopped."
            : t.listName
              ? `Done. They're in the list "${t.listName}".`
              : "Done."
        }
        error={error}
        onStop={onStop}
        stats={[
          { label: "Read", value: t.scanned },
          { label: "New contacts", value: t.created },
          { label: "Already here", value: t.alreadyMigrated },
          { label: "Held back", value: held },
        ]}
        notes={[...(heldNote ? [heldNote] : []), ...(t.warnings ?? [])]}
      />
      {status === "done" ? (
        <Button asChild size="sm" variant="outline">
          <Link href="/audience">See contacts</Link>
        </Button>
      ) : null}
    </div>
  );
}
