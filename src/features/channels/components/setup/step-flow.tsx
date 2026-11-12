import { Tick02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

import { type FlowStep, nextStep } from "../../utils/setup-flow";
import { Icon } from "@/shared/components/common/hugeicon";

/**
 * The three-node progress line every channel's setup opens with: what is done,
 * what is next, and what "live" looks like. Each channel words its own nodes.
 */
export function StepFlow({
  steps,
  label,
}: {
  steps: readonly FlowStep[];
  /** What the line is progress of, for a screen reader: "Email setup". */
  label: string;
}) {
  const current = nextStep(steps);
  return (
    <ol
      aria-label={label}
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      {steps.map((step, index) => {
        const isCurrent = current === index;
        return (
          <li
            key={step.label}
            aria-current={isCurrent ? "step" : undefined}
            className="flex items-center gap-2 text-sm"
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums",
                step.done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : isCurrent
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground"
              )}
            >
              {step.done ? (
                <Icon icon={Tick02Icon} className="size-3" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                step.done || isCurrent
                  ? "text-foreground"
                  : "text-muted-foreground",
                isCurrent && "font-medium"
              )}
            >
              {step.label}
              <span className="sr-only">
                {step.done ? " (done)" : isCurrent ? " (next)" : ""}
              </span>
            </span>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px w-8",
                  step.done ? "bg-emerald-500/60" : "bg-border"
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
