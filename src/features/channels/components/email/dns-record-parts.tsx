import { CopyButton } from "@/components/common/copy-button";

import { cn } from "@/lib/utils";

import type { DnsRecordRow } from "../../utils/domain-dns";

/** The edit instructions for a conflicting (or informational) existing record. */
export function ConflictBox({
  conflict,
}: {
  conflict: NonNullable<DnsRecordRow["conflict"]>;
}) {
  return (
    <div
      className={cn(
        "mt-2 rounded-lg border p-2.5 text-xs leading-5",
        conflict.informational
          ? "border-border/70 bg-muted/30 text-muted-foreground"
          : "border-amber-500/40 bg-amber-500/10 text-foreground"
      )}
    >
      <div className="font-medium">
        {conflict.informational
          ? "Existing record found"
          : "Conflicting record - update it"}
      </div>
      {conflict.reason ? (
        <p className="mt-1 text-muted-foreground">{conflict.reason}</p>
      ) : null}
      {conflict.actions.map((action) => (
        <div
          key={[action.action, action.host, action.newHost, action.newValue]
            .filter(Boolean)
            .join("|")}
          className="mt-1.5 flex flex-wrap items-center gap-1.5"
        >
          <span className="inline-flex rounded-full border border-border/70 bg-background/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase">
            {action.action}
          </span>
          {action.host && action.newHost ? (
            // A rename: the record is right but saved under the wrong name
            // (typically the zone appended twice). Show where it is now, and
            // the exact name to type instead.
            <span className="flex flex-wrap items-center gap-1">
              <code className="break-all rounded bg-muted px-1.5 py-0.5 text-[11px] line-through opacity-70">
                {action.host}
              </code>
              <span aria-hidden>→</span>
              <code className="break-all rounded bg-muted px-1.5 py-0.5 text-[11px]">
                {action.newHost}
              </code>
              <CopyButton value={action.newHost} label="Copy" />
            </span>
          ) : null}
          {action.host &&
          !action.newHost &&
          !action.currentValue &&
          !action.newValue ? (
            // A value-less action (e.g. "remove the misplaced record") is about
            // a record NAME, not a value - the value is already on the card.
            // Show the full name to act on, with a copy button to find it.
            <span className="flex items-center gap-1">
              <code className="break-all rounded bg-muted px-1.5 py-0.5 text-[11px]">
                {action.host}
              </code>
              <CopyButton value={action.host} label="Copy" />
            </span>
          ) : null}
          {action.currentValue ? (
            <code className="break-all rounded bg-muted px-1.5 py-0.5 text-[11px] line-through opacity-70">
              {action.currentValue}
            </code>
          ) : null}
          {action.newValue ? (
            <span className="flex items-center gap-1">
              <code className="break-all rounded bg-muted px-1.5 py-0.5 text-[11px]">
                {action.newValue}
              </code>
              <CopyButton value={action.newValue} label="Copy" />
            </span>
          ) : null}
        </div>
      ))}
      {conflict.resolution &&
      (conflict.actions.length === 0 ||
        conflict.actions.some((a) => a.newHost)) ? (
        <p className="mt-1">{conflict.resolution}</p>
      ) : null}
    </div>
  );
}
