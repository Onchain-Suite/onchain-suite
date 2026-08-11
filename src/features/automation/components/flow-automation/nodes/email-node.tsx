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
  const subtitle = needsSetup
    ? "Needs setup"
    : (data.subject?.trim() ?? "").length > 0
      ? (data.subject as string)
      : templateLabel.length > 0
        ? templateLabel
        : "Email or reusable template";
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-indigo-500/20 bg-indigo-500/10">
          <EnvelopeIcon
            aria-hidden="true"
            className="h-4 w-4 text-indigo-600 dark:text-indigo-400"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Send Email
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
