import { TagIcon } from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { type AutomationNodeData } from "@/features/automation/types";

interface TagNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

/** Audience action node that tags the matched profile (`add_tag`). */
export const TagNode = ({ data, selected }: TagNodeProps) => {
  const tags =
    Array.isArray(data.tags) && data.tags.length > 0
      ? data.tags
      : data.tag
        ? [data.tag]
        : [];
  const needsSetup = tags.length === 0;
  return (
    <div
      className={`relative w-[260px] rounded-lg border bg-card p-3 shadow-sm transition-all ${
        selected
          ? "border-emerald-500/60 shadow-emerald-500/10 ring-2 ring-emerald-500/25"
          : "border-border hover:border-emerald-500/40 hover:shadow-lg"
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
        className="h-2.5 w-2.5 border-2 border-emerald-400 bg-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2.5 w-2.5 border-2 border-emerald-400 bg-background"
      />
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
          <TagIcon
            aria-hidden="true"
            className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
          />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            Add Tag
          </p>
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {data.label}
          </p>
        </div>
      </div>
      {needsSetup ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-amber-500"
          />
          Needs setup
        </p>
      ) : (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
