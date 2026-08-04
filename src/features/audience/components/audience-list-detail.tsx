"use client";

import { ArrowLeftIcon, UsersIcon } from "@heroicons/react/24/outline";

import type { AudienceSegment } from "../audience.service";

/**
 * In-page detail for a single list/segment (reached from the Lists table).
 * Mirrors the reference: back link, a header with contact + email-reachable
 * counts, the ZK-privacy note, and the members area.
 *
 * List membership isn't exposed by the audience API yet (there's no
 * `listProfiles` filter by segment), so members render as the reference's
 * empty state — the count still comes from the segment.
 */
export function AudienceListDetail({
  segment,
  onBack,
}: {
  segment: AudienceSegment;
  onBack: () => void;
}) {
  const count = typeof segment.count === "number" ? segment.count : 0;

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Back to lists
      </button>

      <div>
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {segment.name}
          </h2>
          <span className="text-sm text-muted-foreground">
            List · {count.toLocaleString()} contact{count === 1 ? "" : "s"}
            {count === 0 ? " · 0 email-reachable" : ""}
          </span>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Every wallet in this list. Addresses show only for imported contacts —
          ZK-linked emails stay protected, so you can message them without ever
          seeing who they are.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <UsersIcon className="size-5" aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">
          {count === 0 ? "No members yet" : `${count.toLocaleString()} members`}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {count === 0
            ? "Contacts will appear here as they join."
            : "Member details appear here once the audience API exposes list membership."}
        </p>
      </div>
    </div>
  );
}
