import { CheckIcon } from "@heroicons/react/24/solid";

import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Audience", sub: "Who receives it" },
  { n: 2, label: "Message", sub: "Content & template" },
  { n: 3, label: "Review", sub: "Check & send" },
] as const;

/**
 * Left rail for the campaign wizard - numbered Audience / Message / Review
 * steps with done/active states. Collapses to a horizontal row on small
 * screens. Presentational only; the parent owns `currentStep`.
 */
export function WizardStepRail({ currentStep }: { currentStep: number }) {
  return (
    <nav
      aria-label="Campaign steps"
      className="lg:sticky lg:top-6 lg:self-start"
    >
      <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {STEPS.map((step) => {
          const done = currentStep > step.n;
          const active = currentStep === step.n;
          return (
            <li key={step.n}>
              <div
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                  active ? "bg-accent" : "bg-transparent"
                )}
              >
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
                      active || done
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="hidden whitespace-nowrap text-xs text-muted-foreground lg:block">
                    {step.sub}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
