import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { type AutomationNodeData } from "@/features/automation/types";

interface TelegramNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

/** Telegram message action node (`send_telegram`). */
export const TelegramNode = ({ data, selected }: TelegramNodeProps) => {
  const text = typeof data.text === "string" ? data.text : "";
  const needsSetup =
    typeof data.needsSetup === "boolean"
      ? data.needsSetup
      : text.trim().length === 0;
  const subtitle = needsSetup ? "Needs setup" : text;
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
        className="h-2.5 w-2.5 border-2 border-sky-400 bg-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2.5 w-2.5 border-2 border-sky-400 bg-background"
      />
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sky-500/20 bg-sky-500/10">
          <PaperAirplaneIcon
            aria-hidden="true"
            className="h-4 w-4 text-sky-600 dark:text-sky-400"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Send Telegram
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
