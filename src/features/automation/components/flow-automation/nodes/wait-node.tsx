import { ClockIcon } from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { type AutomationNodeData } from "@/features/automation/types";

interface WaitNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

export const WaitNode = ({ data, selected }: WaitNodeProps) => (
  <div
    className={`w-[260px] rounded-lg border bg-card p-3 shadow-sm transition-all ${
      selected
        ? "border-violet-500/60 shadow-violet-500/10 ring-2 ring-violet-500/25"
        : "border-border hover:border-violet-500/40 hover:shadow-lg"
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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
        <ClockIcon
          aria-hidden="true"
          className="h-4 w-4 text-violet-600 dark:text-violet-400"
        />
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
          Wait
        </p>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          {data.duration ?? "3 days"}
        </p>
      </div>
    </div>
  </div>
);
