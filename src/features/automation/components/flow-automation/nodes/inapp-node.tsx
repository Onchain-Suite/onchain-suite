import { BellAlertIcon } from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { type AutomationNodeData } from "@/features/automation/types";

interface InappNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

/** In-app notification action node (`send_inapp`). */
export const InappNode = ({ data, selected }: InappNodeProps) => (
  <div
    className={`min-w-[216px] rounded-xl border bg-card p-3.5 shadow-sm transition-all ${
      selected
        ? "border-violet-500/60 shadow-violet-500/10 ring-2 ring-violet-500/25"
        : "border-border hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-lg"
    }`}
  >
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
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
        <BellAlertIcon
          aria-hidden="true"
          className="h-4 w-4 text-violet-600 dark:text-violet-400"
        />
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-violet-600 dark:text-violet-400">
          Send In-App
        </p>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          {data.label}
        </p>
      </div>
    </div>
    {(data.title ?? data.body) && (
      <div className="mt-2.5 rounded-xl border border-violet-500/15 bg-violet-500/5 px-3 py-2">
        {data.title && (
          <p className="text-xs font-medium text-foreground">{data.title}</p>
        )}
        {data.body && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {data.body}
          </p>
        )}
      </div>
    )}
  </div>
);
