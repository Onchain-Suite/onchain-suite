import { PlusIcon } from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { type AutomationNodeData } from "@/features/automation/types";

interface PlaceholderNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

export const PlaceholderNode = ({
  data,
  selected: _selected,
}: PlaceholderNodeProps) => (
  <div className="w-[260px] rounded-2xl border border-dashed border-border bg-muted/40 p-3 transition-colors hover:border-primary/40 hover:bg-muted/60">
    <Handle
      type="target"
      position={Position.Top}
      className="h-2.5 w-2.5 border-2 border-muted-foreground bg-background"
    />
    <div className="flex items-center justify-center gap-2 text-center">
      <PlusIcon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="font-medium text-foreground">{data.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">Drag a node here</p>
      </div>
    </div>
  </div>
);
