import { CheckIcon } from "@heroicons/react/24/solid";

import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Audience", sub: "Who receives it" },
  { n: 2, label: "Message", sub: "Content & template" },
  { n: 3, label: "Review", sub: "Check & send" },
] as const;

/**
 * Left rail for the campaign wizard — numbered Audience / Message / Review
 * steps with done/active states. Collapses to a horizontal row on small
 * screens. Completed steps (any step before the current one) are clickable so
 * you can jump straight back to edit them; the parent owns `currentStep` and
 * the navigation via `onStepClick`.
 */
export function WizardStepRail({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  /** Navigate to a step. Only completed steps invoke this. */
  onStepClick?: (step: number) => void;
}) {
  return (
    <nav
      aria-label="Campaign steps"
      className="lg:sticky lg:top-6 lg:self-start"
    >
      <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {STEPS.map((step) => {
          const done = currentStep > step.n;
          const active = currentStep === step.n;
          // A completed step can be revisited; the active/upcoming ones can't.
          const clickable = done && Boolean(onStepClick);

          const inner = (
            <>
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  done || active
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
                )}
                aria-hidden="true"
              >
                {done ? <CheckIcon className="h-4 w-4" /> : step.n}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block whitespace-nowrap text-sm font-semibold",
                    active || done ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
                <span className="hidden whitespace-nowrap text-xs text-muted-foreground lg:block">
                  {step.sub}
                </span>
              </span>
            </>
          );

          return (
            <li key={step.n}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick?.(step.n)}
                  aria-label={`Go back to ${step.label}`}
                  className="flex w-full shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {inner}
                </button>
              ) : (
                <div
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                    active ? "bg-accent" : "bg-transparent"
                  )}
                >
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
