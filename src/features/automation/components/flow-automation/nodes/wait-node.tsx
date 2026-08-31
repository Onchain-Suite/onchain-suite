import { ClockIcon } from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { type AutomationNodeData } from "@/features/automation/types";

interface WaitNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

const EVENT_WORDS: Record<string, string> = {
  segment_entered: "a segment entry",
  form_submitted: "a form submission",
  email_opened: "an email open",
  onchain_event: "an on-chain event",
};

export const WaitNode = ({ data, selected }: WaitNodeProps) => {
  const duration =
    typeof data.duration === "string" && data.duration
      ? data.duration
      : typeof data.seconds === "number" && data.seconds > 0
        ? `${data.seconds}s`
        : "";
  const needsSetup = data.needsSetup === true;
  const untilEvent = data.mode === "until_event" && !!data.waitFor;
  const waitFor = String(data.waitFor ?? "");
  // No invented default: a wait with no duration used to read "Wait 3 days"
  // while the runtime refused to publish it (INVALID_WAIT_CONFIG).
  const title =
    duration.length === 0
      ? "Wait"
      : untilEvent
        ? `Wait up to ${duration} for ${EVENT_WORDS[waitFor] ?? waitFor}`
        : `Wait ${duration}`;
  const subtitle = needsSetup
    ? (data.setupHint ?? "Needs setup")
    : untilEvent
      ? "Continue when it happens, else take the timeout branch"
      : "Pause, then continue to the next step";
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
            {title}
          </p>
        </div>
      </div>
      <p className="mt-1.5 truncate text-xs text-muted-foreground">
        {subtitle}
      </p>
    </div>
  );
};
