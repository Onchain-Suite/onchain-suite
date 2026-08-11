import { ClockIcon } from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { type AutomationNodeData } from "@/features/automation/types";

interface WaitNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

export const WaitNode = ({ data, selected }: WaitNodeProps) => (
  <div
    className={`w-[360px] rounded-lg border bg-card p-4 shadow-sm transition-all ${
      selected
        ? "border-primary shadow-lg ring-2 ring-primary/30"
        : "border-border hover:border-primary/40 hover:shadow-lg"
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-2.5 w-2.5 border-2 border-indigo-400 bg-background"
    />
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-2.5 w-2.5 border-2 border-indigo-400 bg-background"
    />
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
        <ClockIcon
          aria-hidden="true"
          className="h-4 w-4 text-indigo-600 dark:text-indigo-400"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Wait
        </p>
        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
          Wait {data.duration ?? "3 days"}
        </p>
      </div>
    </div>
    <p className="mt-1.5 truncate text-xs text-muted-foreground">
      Pause before the next step
    </p>
  </div>
);
