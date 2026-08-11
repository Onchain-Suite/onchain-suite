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
    </div>
  );
};
