"use client";

import { XMarkIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { type ReactNode } from "react";

import { Logo } from "@/components/common";

import { STEP_LABEL, type StepId } from "../../constants/guided";
import { ObIllustration } from "./ob-illustration";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

interface GuidedShellProps {
  /** Zero-based index of the active step within `flow`. */
  stepIndex: number;
  /** The branched step order for the chosen role. */
  flow: StepId[];
  /** The active step's question + inputs. */
  children: ReactNode;
  /** Back / Continue controls, composed by the orchestrator. Omitted when the step owns its own. */
  footer?: ReactNode;
}

/**
 * The guided-onboarding frame (v2.7 revamp): the whole flow sits in a bordered card with the
 * question on the left and a quiet product illustration on its own sunken panel to the right. The
 * form column carries the spacing (generous padding, a width-capped, vertically centred body) so
 * one question has room per screen. Purely presentational: the step machine, inputs and footer
 * actions live in the orchestrator and its step components.
 */
export function GuidedShell({
  stepIndex,
  flow,
  children,
  footer,
}: GuidedShellProps) {
  const at = flow[Math.min(stepIndex, flow.length - 1)];
  return (
    <div className="bg-background flex min-h-screen flex-col items-center px-4 py-7 sm:px-6">
      <div className="relative flex w-[min(1180px,100%)] items-center justify-center">
        <Logo />
        <Link
          href={PRIVATE_ROUTES.DASHBOARD}
          className="text-muted-foreground hover:text-foreground absolute right-0 flex items-center gap-1.5 text-sm transition-colors"
        >
          <XMarkIcon aria-hidden="true" className="h-4 w-4" />
          Back to workspace
        </Link>
      </div>

      <div className="mt-6 grid w-[min(1180px,100%)] flex-1 grid-rows-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:grid-cols-2">
        {/* Question pane */}
        <div className="flex min-w-0 flex-col px-6 py-8 sm:px-10 lg:px-14 lg:py-10">
          {/* Counted, so it is obvious from the first screen that this ends quickly: a line of
                text and a thin bar, not a row of boxed steps competing with the question. */}
          <header className="flex-shrink-0">
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

          <div className="flex flex-1 flex-col justify-center py-8">
            <div className="w-full max-w-[30rem]">{children}</div>
          </div>

          {footer ? (
            <footer className="flex w-full max-w-[30rem] flex-shrink-0 items-center justify-between gap-3">
              {footer}
            </footer>
          ) : null}
        </div>

        {/* Product illustration, on its own quiet panel. */}
        <div className="bg-muted/30 hidden items-center justify-center border-l border-border p-10 lg:flex xl:p-14">
          <ObIllustration flow={flow} stepIndex={stepIndex} />
        </div>
      </div>

      <div className="text-muted-foreground mt-6 flex w-[min(1180px,100%)] flex-shrink-0 items-center justify-center gap-5 px-1 text-xs">
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
