import {
  ArrowsRightLeftIcon,
  CloudIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { type AutomationNodeData } from "@/features/automation/types";

interface BranchNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

export const BranchNode = ({ data, selected }: BranchNodeProps) => (
  <div
    className={`w-[260px] rounded-lg border bg-card p-3 shadow-sm transition-all ${
      selected
        ? "border-cyan-500/60 shadow-cyan-500/10 ring-2 ring-cyan-500/25"
        : "border-border hover:border-cyan-500/40 hover:shadow-lg"
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-2.5 w-2.5 border-2 border-cyan-400 bg-background"
    />
    <Handle
      type="source"
      position={Position.Bottom}
      id="yes"
      className="h-2.5 w-2.5 border-2 border-emerald-400 bg-background"
      style={{ left: "30%" }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      id="no"
      className="h-2.5 w-2.5 border-2 border-orange-400 bg-background"
      style={{ left: "70%" }}
    />
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
        <ArrowsRightLeftIcon
          aria-hidden="true"
          className="h-4 w-4 text-cyan-600 dark:text-cyan-400"
        />
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
          Branch
        </p>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          {data.label}
        </p>
      </div>
    </div>
    <div className="mt-2.5 flex justify-between rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs">
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
        <CloudIcon aria-hidden="true" className="h-3 w-3" /> Cold
      </span>
      <span className="flex items-center gap-1 text-orange-600 dark:text-orange-300">
        <FireIcon aria-hidden="true" className="h-3 w-3" /> Warm
      </span>
    </div>
  </div>
);
