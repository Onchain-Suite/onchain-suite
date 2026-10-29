"use client";

import { cn } from "@/lib/utils";

import { type CampaignGoalId, goalById, GOALS } from "../../data/goals";

/**
 * Conversion-goal picker for the campaign wizard's Review step (2.7). A
 * single-select grid of the goal catalog; "Return to app" is shown but not
 * selectable until its app-event source lands. Presentational - persistence is
 * the caller's (see `use-campaign-goal`).
 */
export function GoalPicker({
  value,
  onChange,
  disabled,
}: {
  value: CampaignGoalId;
  onChange: (id: CampaignGoalId) => void;
  disabled?: boolean;
}) {
  const selected = goalById(value);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {GOALS.map((g) => {
          const active = g.id === value;
          const unavailable = !g.supported;
          const isDisabled = Boolean(disabled) || unavailable;
          return (
            <button
              key={g.id}
              type="button"
              disabled={isDisabled}
              aria-pressed={active}
              onClick={() => onChange(g.id)}
              className={cn(
                "flex items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50",
                isDisabled && "cursor-not-allowed opacity-50"
              )}
            >
              <g.Icon
                aria-hidden="true"
                className={cn(
                  "mt-0.5 h-5 w-5 shrink-0",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="flex flex-col">
                <span className="font-medium text-foreground">{g.label}</span>
                <span className="text-xs text-muted-foreground">
                  {unavailable
                    ? "Coming soon"
                    : g.windowDays > 0
                      ? `${g.windowDays}d window`
                      : "Awareness only"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {value === "none"
          ? "No conversion tracking. This campaign reports reach and engagement only. You can add a goal later."
          : `Wallets that ${selected.verb} within ${selected.windowDays} days of receiving this count as converted. Attribution reads indexed on-chain events, so a goal only counts wallets on a contract you have indexed.`}
      </p>
    </div>
  );
}
