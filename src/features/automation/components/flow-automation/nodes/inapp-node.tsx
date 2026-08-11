import { BellAlertIcon } from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { type AutomationNodeData } from "@/features/automation/types";

interface InappNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

/** In-app notification action node (`send_inapp`). */
export const InappNode = ({ data, selected }: InappNodeProps) => {
  const needsSetup = !data.title && !data.body;
  const subtitle = needsSetup
    ? "Needs setup"
    : (data.title?.trim() ?? "").length > 0
      ? (data.title as string)
      : (data.body as string);
  return (
    <div
      className={`relative w-[260px] rounded-lg border bg-card p-3 shadow-sm transition-all ${
        selected
          ? "border-violet-500/60 shadow-violet-500/10 ring-2 ring-violet-500/25"
          : "border-border hover:border-violet-500/40 hover:shadow-md"
      }`}
    >
      {needsSetup ? (
        <span
          aria-hidden="true"
          className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-orange-500"
        />
      ) : null}
      <Handle
        type="target"
        position={Position.Top}
        className="h-2.5 w-2.5 border-2 border-violet-400 bg-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2.5 w-2.5 border-2 border-violet-400 bg-background"
      />
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-violet-500/20 bg-violet-500/10">
          <BellAlertIcon
            aria-hidden="true"
            className="h-4 w-4 text-violet-600 dark:text-violet-400"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
            Send In-App
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
