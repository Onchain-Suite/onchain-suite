import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { type AutomationNodeData } from "@/features/automation/types";

interface EmailNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

export const EmailNode = ({ data, selected }: EmailNodeProps) => {
  // The config panel writes `templateId` / `templateName` (not `template`), so
  // key the setup state off those; keep `template` as a legacy fallback.
  const templateLabel =
    (typeof data.templateName === "string" && data.templateName) ||
    (typeof data.template === "string" && data.template) ||
    "";
  const needsSetup = templateLabel.length === 0;
  return (
    <div
      className={`relative min-w-[216px] rounded-xl border bg-card p-3.5 shadow-sm transition-all ${
        selected
          ? "border-indigo-500/60 shadow-indigo-500/10 ring-2 ring-indigo-500/25"
          : "border-border hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-lg"
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
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
          <EnvelopeIcon
            aria-hidden="true"
            className="h-4 w-4 text-indigo-600 dark:text-indigo-400"
          />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">
            Send Email
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
        <div className="mt-2.5 space-y-2">
          <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 px-3 py-2">
            <p className="text-xs font-medium text-foreground">
              {templateLabel}
            </p>
            {data.subject && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {data.subject}
              </p>
            )}
          </div>
          {data.dynamicFields && (
            <div className="flex flex-wrap gap-1">
              {data.dynamicFields.slice(0, 3).map((field: string) => (
                <span
                  key={field}
                  className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {field}
                </span>
              ))}
              {data.dynamicFields.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{data.dynamicFields.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
