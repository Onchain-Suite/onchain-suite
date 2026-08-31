import { QueueListIcon } from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { type AutomationNodeData } from "@/features/automation/types";

interface AddToListNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

/** Audience action node that adds the matched contact to a list (`add_to_list`). */
export const AddToListNode = ({ data, selected }: AddToListNodeProps) => {
  const listName =
    typeof data.listName === "string" && data.listName.length > 0
      ? data.listName
      : typeof data.listId === "string" && data.listId.length > 0
        ? data.listId
        : "";
  const needsSetup =
    typeof data.needsSetup === "boolean"
      ? data.needsSetup
      : listName.length === 0;
  return (
    <div
      className={`relative w-[360px] rounded-lg border bg-card p-4 shadow-sm transition-all ${
        selected
          ? "border-primary shadow-lg ring-2 ring-primary/30"
          : "border-border hover:border-primary/40 hover:shadow-lg"
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
        className="h-2.5 w-2.5 border-2 border-indigo-400 bg-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2.5 w-2.5 border-2 border-indigo-400 bg-background"
      />
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
          <QueueListIcon
            aria-hidden="true"
            className="h-4 w-4 text-indigo-600 dark:text-indigo-400"
          />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Add to List
          </p>
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {data.label}
          </p>
        </div>
      </div>
      {needsSetup ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-orange-500"
          />
          Needs setup
        </p>
      ) : (
        <div className="mt-2.5 rounded-lg border border-indigo-500/15 bg-indigo-500/5 px-3 py-2">
          <p className="line-clamp-1 text-xs text-muted-foreground">
            List: <span className="text-foreground">{listName}</span>
          </p>
        </div>
      )}
    </div>
  );
};
