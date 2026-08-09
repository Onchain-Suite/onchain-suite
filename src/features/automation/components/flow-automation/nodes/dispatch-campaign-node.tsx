import { RocketLaunchIcon } from "@heroicons/react/24/outline";
import { Handle, Position } from "reactflow";

import { type AutomationNodeData } from "@/features/automation/types";

interface DispatchCampaignNodeProps {
  data: AutomationNodeData;
  selected: boolean;
}

/** Messaging action node that triggers an existing campaign (`dispatch_campaign`). */
export const DispatchCampaignNode = ({
  data,
  selected,
}: DispatchCampaignNodeProps) => {
  const needsSetup = !data.campaignId;
  return (
    <div
      className={`relative min-w-[216px] rounded-xl border bg-card p-3.5 shadow-sm transition-all ${
        selected
          ? "border-rose-500/60 shadow-rose-500/10 ring-2 ring-rose-500/25"
          : "border-border hover:-translate-y-0.5 hover:border-rose-500/40 hover:shadow-lg"
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
        className="h-2.5 w-2.5 border-2 border-rose-400 bg-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2.5 w-2.5 border-2 border-rose-400 bg-background"
      />
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10">
          <RocketLaunchIcon
            aria-hidden="true"
            className="h-4 w-4 text-rose-600 dark:text-rose-400"
          />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-rose-600 dark:text-rose-400">
            Dispatch Campaign
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
        <div className="mt-2.5 rounded-xl border border-rose-500/15 bg-rose-500/5 px-3 py-2">
          <p className="line-clamp-1 text-xs text-muted-foreground">
            Campaign: <span className="text-foreground">{data.campaignId}</span>
          </p>
        </div>
      )}
    </div>
  );
};
