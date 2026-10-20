"use client";

import { type ReactNode } from "react";

import { Logo } from "@/components/common";

import { STEP_LABEL, type StepId } from "../../constants/guided";
import { ObPreview, type ObPreviewLit } from "./ob-preview";

interface GuidedShellProps {
  /** Zero-based index of the active step within `flow`. */
  stepIndex: number;
  /** The branched step order for the chosen role. */
  flow: StepId[];
  /** Which region of the product preview to light. */
  lit: ObPreviewLit;
  /** The active step's question + inputs. */
  children: ReactNode;
  /** Back / Continue controls, composed by the orchestrator. */
  footer: ReactNode;
}

/**
 * The guided-onboarding frame (v2.7 revamp): brand, a counted progress line, the question pane,
 * and a muted product preview beside it. Purely presentational - the step machine, the inputs and
 * the footer actions all live in the orchestrator and its step components. It replaces the older
 * split "form + illustration" `OnboardingLayout` for the guided flow.
 */
export function GuidedShell({
  stepIndex,
  flow,
  lit,
  children,
  footer,
}: GuidedShellProps) {
  const at = flow[Math.min(stepIndex, flow.length - 1)];
  return (
    <div className="bg-background flex min-h-screen flex-col px-4 py-6 sm:px-8 sm:py-8">
      <Logo />

      <div className="mx-auto grid w-full max-w-5xl flex-1 items-stretch gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col">
          {/* Counted, so it is obvious from the first screen that this ends quickly: a line of
              text and a thin bar, not a row of boxed steps competing with the question. */}
          <header className="mb-8">
            <span className="text-muted-foreground text-sm">
              Step {stepIndex + 1} of {flow.length}
              <span className="px-1.5 opacity-40">·</span>
              <b className="text-foreground font-semibold">{STEP_LABEL[at]}</b>
            </span>
            <div
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={flow.length}
              aria-valuenow={stepIndex + 1}
              aria-valuetext={`Step ${stepIndex + 1} of ${flow.length}: ${STEP_LABEL[at]}`}
              className="mt-3 flex gap-1.5"
            >
              {flow.map((id, i) => (
                <span
                  key={id}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= stepIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </header>

          <div className="flex-1">{children}</div>

          <footer className="mt-8 flex items-center justify-between gap-3">
            {footer}
          </footer>
        </div>

        <ObPreview lit={lit} />
      </div>

      <div className="text-muted-foreground mx-auto flex w-full max-w-5xl items-center gap-4 text-xs">
        <span>© 2026 OnchainSuite</span>
        <a
          href="https://onchainsuite.xyz/privacy"
          className="hover:text-foreground"
        >
          Privacy
        </a>
        <a
          href="https://onchainsuite.xyz/support"
          className="hover:text-foreground"
        >
          Support
        </a>
      </div>
    </div>
  );
}
