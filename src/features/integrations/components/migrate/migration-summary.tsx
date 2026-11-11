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
  incomplete = false,
  background = false,
  stopping = false,
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
  /** Finished, but the source had more than it would hand over. */
  incomplete?: boolean;
  /** Runs on the server: closing this does not stop it. */
  background?: boolean;
  /** Stop was pressed; the batch in progress is finishing. */
  stopping?: boolean;
  onStop?: () => void;
}) {
  const held = heldTotal(t.held);
  const n = (v: number) => v.toLocaleString("en-US");
  const heldNote =
    held > 0
      ? `${n(held)} held back: ${n(t.held.unsubscribed)} unsubscribed, ${n(t.held.unconfirmed)} unconfirmed, ${n(t.held.invalid)} invalid, ${n(t.held.unreachable)} unreachable.`
      : null;
  return (
    <div className="space-y-2">
      <RunProgress
        status={status}
        running={
          stopping
            ? "Stopping after this batch…"
            : background
              ? `Bringing contacts across from ${label}. You can close this; it carries on.`
              : `Bringing contacts across from ${label}…`
        }
        done={
          capped
            ? "Paused after a long run. Run again to carry on from where it stopped."
            : t.listName
              ? `Done. They're in the list "${t.listName}".`
              : "Done."
        }
        error={error}
        onStop={stopping ? undefined : onStop}
        stats={[
          { label: "Read", value: t.scanned },
          { label: "New contacts", value: t.created },
          { label: "Already here", value: t.alreadyMigrated },
          { label: "Held back", value: held },
        ]}
        notes={[
          ...(incomplete
            ? [
                `${label} had more contacts than it would hand over in one go. Run it again to pick up the rest.`,
              ]
            : []),
          ...(heldNote ? [heldNote] : []),
          ...(t.warnings ?? []),
        ]}
      />
      {status === "done" ? (
        <Button asChild size="sm" variant="outline">
          <Link href="/audience">See contacts</Link>
        </Button>
      ) : null}
    </div>
  );
}
