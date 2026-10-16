import { BoltIcon } from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { formatRelativeTime } from "@/lib/date";

import { type AutomationNodeData } from "@/features/automation/types";

interface TriggerNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

/** Values older graphs stored in place of a real selection. */
const PLACEHOLDERS = new Set(["Select Contract", "Select Event"]);
const real = (value: unknown): string => {
  const text = typeof value === "string" ? value.trim() : "";
  return PLACEHOLDERS.has(text) ? "" : text;
};

export const TriggerNode = ({ data, selected }: TriggerNodeProps) => {
  // Preset triggers (swap, token acquired, …) imply their own event, so only
  // the contract is theirs to set; the builder decides what is still missing
  // and passes it down, so this never disagrees with the issues list.
  const contract = real(data.contract) || real(data.contractAddress);
  const event = real(data.event);
  const needsSetup =
    typeof data.needsSetup === "boolean"
      ? data.needsSetup
      : contract.length === 0;
  const summary =
    [contract, event, real(data.chain)].filter(Boolean).join(" · ") ||
    (typeof data.preview === "string" ? data.preview : "");
  const subtitle = needsSetup
    ? (data.setupHint ?? "Needs setup")
    : summary.length > 0
      ? summary
      : "Configured";
  return (
    <div
      className={`relative w-[360px] rounded-lg border bg-card p-4 shadow-sm transition-all ${
        selected
          ? "border-primary shadow-lg ring-2 ring-primary/30"
          : "border-border hover:border-primary/40 hover:shadow-md"
      }`}
    >
      {needsSetup ? (
        <span
          aria-hidden="true"
          className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-orange-500"
        />
      ) : null}
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2.5 w-2.5 border-2 border-orange-400 bg-background"
      />
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-orange-500/20 bg-orange-500/10">
          <BoltIcon
            aria-hidden="true"
            className="h-4 w-4 text-orange-600 dark:text-orange-400"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Trigger
          </p>
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
            {data.label}
          </p>
        </div>
      </div>
      <p className="mt-1.5 truncate text-xs text-muted-foreground">
        {subtitle}
      </p>
      {/* Subscription state for a live automation. `watchLive` is undefined
          while we do not know (unpublished, or the subscription read failed),
          and unknown must never read as dead. */}
      {typeof data.watchLive === "boolean" ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              data.watchLive ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <span
            className={
              data.watchLive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }
          >
            {data.watchLive ? "Live" : "Not live"}
          </span>
          {data.watchLive ? (
            <span className="truncate text-muted-foreground">
              {data.watchLastEventAt
                ? `last event ${formatRelativeTime(data.watchLastEventAt)}`
                : "no events yet"}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
};
