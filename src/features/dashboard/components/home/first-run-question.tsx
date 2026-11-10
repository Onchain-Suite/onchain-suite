"use client";

import {
  ContractsIcon,
  Globe02Icon,
  UserListIcon,
} from "@hugeicons/core-free-icons";

import { START_OPTIONS } from "../../data/start-options";
import { startTour } from "@/features/onboarding/hooks/use-tour";
import type { StartPath } from "@/features/onboarding/utils/start-path";
import { Icon, type IconSvgElement } from "@/shared/components/common/hugeicon";

const GLYPH: Record<StartPath, IconSvgElement> = {
  people: UserListIcon,
  site: Globe02Icon,
  chain: ContractsIcon,
};

/**
 * The first-run Home before the question is answered (2.7, 7 Nov 2026): what
 * do you have today? It is the whole screen, because nothing below it means
 * anything until it is answered. Each answer starts the same six steps in a
 * different order, so the first thing anyone does is their own quickest win.
 */
export function FirstRunQuestion({
  heading,
  workspaceName,
  onAnswer,
}: {
  heading: string;
  workspaceName: string;
  onAnswer: (path: StartPath) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-[22px]">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px] text-(--text-primary)">
          {heading}
        </h1>
        <p className="mt-1.5 text-[14.5px] text-(--text-secondary)">
          Welcome to{" "}
          <b className="font-semibold text-(--text-primary)">{workspaceName}</b>
          . One question, so we start you in the right place.
        </p>
      </header>

      <section
        aria-labelledby="first-run-question"
        className="rounded-2xl border border-(--border-subtle) bg-card px-7 pt-7 pb-[30px] shadow-(--elevation-1)"
      >
        <h2
          id="first-run-question"
          className="text-[22px] font-semibold tracking-[-0.3px] text-(--text-primary)"
        >
          What do you have today?
        </h2>
        <p className="mt-1.5 mb-5 text-sm text-(--text-secondary)">
          Pick the one closest to you. You can add the others later; this only
          decides what comes first.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {START_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onAnswer(o.id)}
              className="flex flex-col items-start gap-1.5 rounded-xl border border-(--border-default) bg-card p-[18px] text-left transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-primary hover:shadow-(--elevation-2) focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none motion-reduce:hover:translate-y-0"
            >
              <span className="mb-1.5 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon icon={GLYPH[o.id]} className="size-5" />
              </span>
              <b className="text-[15px] font-semibold text-(--text-primary)">
                {o.title}
              </b>
              <span className="text-[13px] leading-normal text-(--text-secondary)">
                {o.desc}
              </span>
              <span className="mt-auto w-full border-t border-(--border-subtle) pt-2.5 text-[12.5px] leading-normal text-(--text-primary)">
                {o.win}
              </span>
            </button>
          ))}
        </div>
      </section>

      <p className="mt-4 px-1 text-[13px] text-(--text-tertiary)">
        Not sure yet?{" "}
        <button
          type="button"
          onClick={startTour}
          className="font-medium text-primary hover:underline"
        >
          Take the two-minute tour
        </button>{" "}
        first.
      </p>
    </div>
  );
}
