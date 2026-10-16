import { CopyButton } from "@/components/common/copy-button";

import { cn } from "@/lib/utils";

import type { DnsRecordRow } from "./domain-dns";

/** A labelled, copyable DNS value (Host, Value, Recommended value). */
export function DnsField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-start gap-1.5">
        <code className="block min-w-0 flex-1 break-all rounded-md bg-muted px-2 py-1 text-xs text-foreground">
          {value}
        </code>
        <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
      </div>
    </div>
  );
}

/** What is live in the user's DNS right now ([] renders as "Nothing published"). */
export function CurrentInDns({ current }: { current: string[] | undefined }) {
  if (current === undefined) return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground">Current in your DNS</div>
      {current.length === 0 ? (
        <div className="mt-1 rounded-md border border-dashed border-border/70 px-2 py-1 text-xs italic text-muted-foreground">
          Nothing published yet
        </div>
      ) : (
        <div className="mt-1 space-y-1">
          {current.map((live) => (
            <code
              key={live}
              className="block break-all rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground"
            >
              {live}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

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
          key={[action.action, action.host, action.newValue]
            .filter(Boolean)
            .join("|")}
          className="mt-1.5 flex flex-wrap items-center gap-1.5"
        >
          <span className="inline-flex rounded-full border border-border/70 bg-background/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase">
            {action.action}
          </span>
          {action.host && !action.currentValue && !action.newValue ? (
            // A value-less action (e.g. "remove the misplaced record") is about
            // a record NAME, not a value — the value is already on the card.
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
      {conflict.actions.length === 0 && conflict.resolution ? (
        <p className="mt-1">{conflict.resolution}</p>
      ) : null}
    </div>
  );
}
