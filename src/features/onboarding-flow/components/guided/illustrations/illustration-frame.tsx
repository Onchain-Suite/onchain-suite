"use client";

import { CheckIcon } from "@heroicons/react/20/solid";
import {
  type ComponentType,
  createContext,
  Fragment,
  type ReactNode,
  useContext,
} from "react";

import { STEP_LABEL, type StepId } from "../../../constants/guided";

/** Where the flow is up to, so every scene can show the same setup progress at its top. */
const StepperContext = createContext<{
  flow: StepId[];
  stepIndex: number;
} | null>(null);

export function StepperProvider({
  flow,
  stepIndex,
  children,
}: {
  flow: StepId[];
  stepIndex: number;
  children: ReactNode;
}) {
  return (
    <StepperContext.Provider value={{ flow, stepIndex }}>
      {children}
    </StepperContext.Provider>
  );
}

/** A compact "step X of Y" progress row with done / current / upcoming dots. */
function SetupStepper({
  flow,
  stepIndex,
}: {
  flow: StepId[];
  stepIndex: number;
}) {
  const current = flow[Math.min(stepIndex, flow.length - 1)];
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-[11px] font-medium">
          Setup · step {stepIndex + 1} of {flow.length}
        </p>
        <p className="text-primary text-[11px] font-semibold">
          {STEP_LABEL[current]}
        </p>
      </div>
      <ol className="mt-2.5 flex items-center gap-1.5">
        {flow.map((id, i) => {
          const done = i < stepIndex;
          const isCurrent = i === stepIndex;
          return (
            <Fragment key={id}>
              <li
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary/15 ring-primary ring-2"
                      : "bg-muted"
                }`}
              >
                {done ? (
                  <CheckIcon aria-hidden className="h-2.5 w-2.5" />
                ) : (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isCurrent ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                  />
                )}
              </li>
              {i < flow.length - 1 ? (
                <span
                  className={`h-px flex-1 ${i < stepIndex ? "bg-primary" : "bg-border"}`}
                />
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Shared chrome for the per-step onboarding illustrations: the muted brand wash, the product-card
 * window frame, the setup stepper (from context) and a floating chip. Each step renders its own
 * scene inside this; all decorative, so the owning <aside> is aria-hidden.
 */
export function IllustrationShell({
  children,
  chips,
  wide = false,
}: {
  children: ReactNode;
  chips?: ReactNode;
  // Widens the card for steps whose left column runs long (the contract step's suggestions list),
  // so the illustration keeps pace with the question instead of floating small beside it.
  wide?: boolean;
}) {
  const stepper = useContext(StepperContext);
  return (
    <aside aria-hidden className="relative hidden lg:block">
      <div className="pointer-events-none absolute -inset-8 -z-10">
        <div className="bg-primary/15 absolute right-6 top-10 h-48 w-48 rounded-full blur-3xl" />
        <div className="bg-primary/10 absolute bottom-6 left-0 h-40 w-40 rounded-full blur-3xl" />
      </div>

      <div
        className={`relative mx-auto w-full ${wide ? "max-w-md" : "max-w-sm"}`}
      >
        <div className="bg-card overflow-hidden rounded-2xl border border-border shadow-[0_30px_80px_-40px_rgba(23,39,224,0.45)]">
          <div className="bg-muted/40 flex items-center gap-2 border-b border-border px-4 py-2.5">
            <span className="bg-primary/30 h-2.5 w-2.5 rounded-full" />
            <span className="bg-primary/20 h-2.5 w-2.5 rounded-full" />
            <span className="bg-primary/10 h-2.5 w-2.5 rounded-full" />
            <span className="text-muted-foreground ml-1.5 text-[11px] font-medium">
              Onchain Suite
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="bg-primary/40 absolute inline-flex h-full w-full animate-ping rounded-full" />
                <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
              </span>
              <span className="text-muted-foreground text-[10px]">Live</span>
            </span>
          </div>
          <div className="space-y-4 p-4">
            {stepper ? (
              <SetupStepper flow={stepper.flow} stepIndex={stepper.stepIndex} />
            ) : null}
            {children}
          </div>
        </div>
        {chips}
      </div>
    </aside>
  );
}

/** A small card that floats just outside the frame, for a bit of life. `className` positions it. */
export function FloatingChip({
  className = "",
  icon: Icon,
  title,
  subtitle,
}: {
  className?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      className={`bg-card absolute flex items-center gap-2 rounded-xl border border-border px-3 py-2 shadow-lg ${className}`}
    >
      <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <span>
        <span className="text-foreground block text-[11px] font-semibold leading-tight">
          {title}
        </span>
        {subtitle ? (
          <span className="text-muted-foreground block text-[10px] leading-tight">
            {subtitle}
          </span>
        ) : null}
      </span>
    </div>
  );
}
