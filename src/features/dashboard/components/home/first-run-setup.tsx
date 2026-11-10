"use client";

import {
  ArrowRight01Icon,
  Clock01Icon,
  PlusSignIcon,
  SignalIcon,
  TaskDaily01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import {
  START_OPTIONS,
  STEP_ACTION,
  STEP_EFFORT,
} from "../../data/start-options";
import type { SetupStep } from "../../hooks/use-setup-steps";
import { startTour } from "@/features/onboarding/hooks/use-tour";
import type { StartPath } from "@/features/onboarding/utils/start-path";
import { CerebraMark } from "@/features/onboarding-flow/components/guided/cerebra-mark";
import { Icon } from "@/shared/components/common/hugeicon";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const H2 = "mb-3 text-[15px] font-semibold text-(--text-primary)";
const CARD =
  "flex flex-col gap-1.5 rounded-xl border border-(--border-subtle) bg-card p-4 text-left transition-[border-color,box-shadow] hover:border-(--border-default) hover:shadow-(--elevation-1) focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none";

/**
 * The first-run Home once the question is answered (2.7, 7 Nov 2026), and the
 * only place the checklist lives: the next step is the hero with its action on
 * it, the six steps sit below with an honest estimate of how long each takes,
 * and the things that work before any data arrives are offered.
 */
export function FirstRunSetup({
  heading,
  workspaceName,
  steps,
  startPath,
  onChangeStart,
  onStep,
}: {
  heading: string;
  workspaceName: string;
  steps: SetupStep[];
  startPath: StartPath | null;
  onChangeStart: () => void;
  onStep: (step: SetupStep) => void;
}) {
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const from = START_OPTIONS.find((o) => o.id === startPath);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-[22px]">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px] text-(--text-primary)">
          {heading}
        </h1>
        <p className="mt-1.5 text-[14.5px] text-(--text-secondary)">
          Let&apos;s get{" "}
          <b className="font-semibold text-(--text-primary)">{workspaceName}</b>{" "}
          live. {done} of {steps.length} set up.
        </p>
        <div
          role="progressbar"
          aria-label="Setup"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={done}
          className="mt-3.5 flex max-w-80 gap-1"
        >
          {steps.map((s) => (
            <span
              key={s.id}
              className={cn(
                "h-1 flex-1 rounded-full",
                s.done ? "bg-primary" : "bg-(--border-subtle)"
              )}
            />
          ))}
        </div>
        {from ? (
          <p className="mt-3 text-[13px] text-(--text-tertiary)">
            Starting from{" "}
            <b className="font-medium text-(--text-secondary)">
              {from.title.toLowerCase()}
            </b>
            .{" "}
            <button
              type="button"
              onClick={onChangeStart}
              className="font-medium text-primary hover:underline"
            >
              Change
            </button>
          </p>
        ) : null}
      </header>

      {next ? (
        <section
          aria-labelledby="first-run-next"
          className="mb-7 grid items-center gap-8 rounded-xl border border-(--border-subtle) bg-card px-[30px] py-7 shadow-(--elevation-1) md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
        >
          <div>
            <span className="text-[11.5px] font-semibold tracking-wide text-primary uppercase">
              Next step
            </span>
            <h2
              id="first-run-next"
              className="mt-1.5 mb-2 text-[22px] font-semibold tracking-[-0.3px] text-(--text-primary)"
            >
              {next.label}
            </h2>
            <p className="max-w-[56ch] text-sm leading-relaxed text-(--text-secondary)">
              {next.hint}
            </p>
            <div className="mt-[18px] flex flex-wrap items-center gap-4">
              <Button onClick={() => onStep(next)}>
                {STEP_ACTION[next.id] ?? next.label}
                <Icon
                  icon={
                    next.id === "contract" ? PlusSignIcon : ArrowRight01Icon
                  }
                  className="ml-1.5 size-4"
                />
              </Button>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-(--text-tertiary)">
                <Icon icon={Clock01Icon} className="size-[13px]" />
                {STEP_EFFORT[next.id]}
              </span>
            </div>
          </div>
          <HomePeek />
        </section>
      ) : null}

      <section id="setup" aria-label="Setup" className="mb-7 scroll-mt-6">
        <h2 className={H2}>Setup</h2>
        <ol className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => {
            const isNext = next?.id === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onStep(s)}
                  disabled={s.done}
                  className={cn(
                    "flex h-full w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                    s.done
                      ? "cursor-default border-(--border-subtle) bg-(--tint-hover)"
                      : "border-(--border-subtle) bg-card hover:border-(--border-default) hover:shadow-(--elevation-1)",
                    isNext && "border-primary/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-semibold",
                      s.done
                        ? "border-(--status-success-border) bg-(--status-success-border) text-white"
                        : isNext
                          ? "border-primary text-primary"
                          : "border-(--border-default) text-(--text-secondary)"
                    )}
                  >
                    {s.done ? (
                      <Icon icon={Tick02Icon} className="size-[13px]" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <b
                      className={cn(
                        "text-sm font-semibold",
                        s.done
                          ? "text-(--text-secondary)"
                          : "text-(--text-primary)"
                      )}
                    >
                      {s.label}
                    </b>
                    <span className="text-[12.5px] leading-snug text-(--text-tertiary)">
                      {s.done ? "Done" : STEP_EFFORT[s.id]}
                    </span>
                  </span>
                  {!s.done ? (
                    <Icon
                      icon={ArrowRight01Icon}
                      className="size-[15px] shrink-0 text-(--text-tertiary)"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label="Works today">
        <h2 className={H2}>Works today, before any data</h2>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {/* The website path already has the form as a setup step. */}
          {startPath !== "site" ? (
            <Link href={`${PRIVATE_ROUTES.FORMS}?new=1`} className={CARD}>
              <CardGlyph>
                <Icon icon={TaskDaily01Icon} className="size-[17px]" />
              </CardGlyph>
              <b className="text-sm font-semibold text-(--text-primary)">
                Build a sign-up form
              </b>
              <span className="text-[12.5px] leading-normal text-(--text-secondary)">
                Turn visitors into contacts, with their consent. Needs nothing
                else set up.
              </span>
            </Link>
          ) : null}
          <Link
            href={`${PRIVATE_ROUTES.INTEGRATIONS}?tab=channels`}
            className={CARD}
          >
            <CardGlyph>
              <Icon icon={SignalIcon} className="size-[17px]" />
            </CardGlyph>
            <b className="text-sm font-semibold text-(--text-primary)">
              Connect a channel
            </b>
            <span className="text-[12.5px] leading-normal text-(--text-secondary)">
              Email, in-app push or X, so the first campaign has somewhere to
              go.
            </span>
          </Link>
          <button type="button" onClick={startTour} className={CARD}>
            <CardGlyph>
              <CerebraMark face size={18} track={false} />
            </CardGlyph>
            <b className="text-sm font-semibold text-(--text-primary)">
              Take the tour
            </b>
            <span className="text-[12.5px] leading-normal text-(--text-secondary)">
              Two minutes on what each section does and where things live.
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}

function CardGlyph({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
      {children}
    </span>
  );
}

/** What Home becomes: the to-do list, not a page of numbers. Decorative. */
const PEEK = [
  "3 replies are waiting for you",
  "A Loop is paused",
  "2 sends are scheduled",
];

function HomePeek() {
  return (
    <div
      aria-hidden="true"
      className="hidden rounded-lg border border-(--border-subtle) bg-(--tint-hover) p-4 [mask-image:linear-gradient(to_bottom,#000_70%,transparent)] md:block"
    >
      <span className="mb-2.5 block text-[11px] font-semibold tracking-wide text-(--text-tertiary) uppercase">
        Home, once you are live
      </span>
      <ul className="flex flex-col gap-[7px]">
        {PEEK.map((text, i) => (
          <li
            key={text}
            className="flex items-center gap-[9px] rounded-md border border-(--border-subtle) bg-card px-2.5 py-[9px]"
          >
            <span
              className={cn(
                "size-[22px] shrink-0 rounded-md",
                i === 0 ? "bg-primary/15" : "bg-(--tint-hover)"
              )}
            />
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-(--text-secondary)">
              {text}
            </span>
            <span className="h-[18px] w-11 shrink-0 rounded-[5px] bg-(--border-default) opacity-60" />
          </li>
        ))}
      </ul>
    </div>
  );
}
