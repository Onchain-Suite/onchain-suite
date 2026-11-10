"use client";

import { cn } from "@/lib/utils";

import type { StartPath } from "../../constants/guided";
import { type GoalOption, goalsFor } from "../../data/goals";

/**
 * Step 2 - the goal (2.7, 7 Nov 2026): the one thing this workspace wants
 * people to do. Everything Analytics counts as a win is it. Cards, suggested
 * from what the team has today, then the rest. It was a dropdown at the foot
 * of a long first step and people went past it.
 */
export function StepGoal({
  start,
  value,
  onChange,
}: {
  start: StartPath | "";
  value: string;
  onChange: (goal: string) => void;
}) {
  const { suggested, more } = goalsFor(start);
  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        What do you want people to do?
      </h1>
      <p className="text-muted-foreground mt-3">
        Pick the one thing that counts as a win. Campaigns, Loops and Analytics
        all measure against it, and you can change it in Settings.
      </p>

      <div role="radiogroup" aria-label="Your goal" className="mt-8 space-y-5">
        {suggested.length > 0 ? (
          <GoalGrid
            heading="Suggested for you"
            goals={suggested}
            value={value}
            onChange={onChange}
          />
        ) : null}
        <GoalGrid
          heading={suggested.length > 0 ? "Or another goal" : undefined}
          goals={more}
          value={value}
          onChange={onChange}
          quiet={suggested.length > 0}
        />
      </div>
    </>
  );
}

function GoalGrid({
  heading,
  goals,
  value,
  onChange,
  quiet = false,
}: {
  heading?: string;
  goals: GoalOption[];
  value: string;
  onChange: (goal: string) => void;
  quiet?: boolean;
}) {
  return (
    <div className="space-y-2">
      {heading ? (
        <p className="text-muted-foreground text-xs font-medium">{heading}</p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {goals.map((g) => {
          const on = value === g.id;
          return (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(g.id)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                on
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/40",
                quiet && !on && "py-2"
              )}
            >
              <b className="text-foreground text-sm font-semibold">
                {g.label}
                {g.onChain ? (
                  <span className="text-muted-foreground ml-1.5 text-[11px] font-medium">
                    On chain
                  </span>
                ) : null}
              </b>
              <span className="text-muted-foreground text-xs">{g.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
