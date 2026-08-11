import { BoltIcon } from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { type AutomationNodeData } from "@/features/automation/types";

interface TriggerNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

export const TriggerNode = ({ data, selected }: TriggerNodeProps) => {
  const needsSetup = !data.contract && !data.event;
  const summary =
    [data.contract, data.event].filter(Boolean).join(" · ") ||
    (typeof data.preview === "string" ? data.preview : "");
  const subtitle = needsSetup
    ? "Needs setup"
    : summary.length > 0
      ? summary
      : "Configured";
  return (
    <div
      className={`relative w-[260px] rounded-lg border bg-card p-3 shadow-sm transition-all ${
        selected
          ? "border-sky-500/60 shadow-sky-500/10 ring-2 ring-sky-500/25"
          : "border-border hover:border-sky-500/40 hover:shadow-md"
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
        className="h-2.5 w-2.5 border-2 border-sky-400 bg-background"
      />
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sky-500/20 bg-sky-500/10">
          <BoltIcon
            aria-hidden="true"
            className="h-4 w-4 text-sky-600 dark:text-sky-400"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">
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
    </div>
  );
};
