"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { useToday } from "../../hooks/use-today";
import {
  dismissForToday,
  readDismissed,
  todaySummary,
} from "../../utils/today";
import { LatelyPanel, ReportLine, RunningPanel } from "./home-side";
import { TodoRow } from "./todo-row";
import { Icon } from "@/shared/components/common/hugeicon";

/*
 * Home for a workspace in use (2.7, 7 Nov 2026): what needs you today, most
 * pressing first, each with the button that does it. Beside it, what is
 * running without you and what happened lately. The numbers are one sentence
 * that leads to Analytics, which answers "how are we doing" better than a
 * strip of cards here did.
 */
export function TodayView({
  greeting,
  name,
}: {
  greeting: string;
  name: string;
}) {
  const today = useToday();
  const [hidden, setHidden] = useState<Set<string>>(() => readDismissed());
  const [showHidden, setShowHidden] = useState(false);

  const open = today.items.filter((i) => !hidden.has(i.id));
  const shown = showHidden ? today.items : open;
  const hiddenCount = today.items.length - open.length;
  const { count, now } = todaySummary(open);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-[22px]">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px] text-(--text-primary)">
          {`Good ${greeting}, ${name}.`}
        </h1>
        <p className="mt-1.5 text-[14.5px] text-(--text-secondary) [&_b]:font-semibold [&_b]:text-(--text-primary)">
          {today.isLoading ? (
            "Checking what needs you today…"
          ) : count === 0 ? (
            "Nothing needs you today. Everything else is running on its own."
          ) : (
            <>
              <b>
                {count === 1 ? "1 thing needs you" : `${count} things need you`}{" "}
                today
              </b>
              {now > 0
                ? `, ${now === 1 ? "1 of them" : `${now} of them`} right now`
                : null}
              . Everything else is running on its own.
            </>
          )}
        </p>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Needs you">
          {today.isLoading ? (
            <ol className="flex flex-col gap-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <li
                  key={i}
                  className="h-[76px] animate-pulse rounded-xl border border-(--border-subtle) bg-card"
                />
              ))}
            </ol>
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-(--border-subtle) bg-card px-6 py-10 text-center">
              <span className="mb-1.5 flex size-11 items-center justify-center rounded-full bg-(--status-success-bg) text-(--status-success-text)">
                <Icon icon={CheckmarkCircle02Icon} className="size-[22px]" />
              </span>
              <b className="text-sm font-semibold text-(--text-primary)">
                All clear
              </b>
              <span className="max-w-sm text-[13px] text-(--text-tertiary)">
                Replies, paused Loops and sends waiting for a check show up here
                as they happen.
              </span>
            </div>
          ) : (
            <ol className="flex flex-col gap-2">
              {shown.map((item) => (
                <TodoRow
                  key={item.id}
                  item={item}
                  done={hidden.has(item.id)}
                  onDone={() => setHidden(dismissForToday(item.id))}
                />
              ))}
            </ol>
          )}
          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowHidden((v) => !v)}
              className="mt-3 px-1 text-[13px] font-medium text-(--text-tertiary) hover:text-(--text-primary)"
            >
              {showHidden
                ? "Hide the ones you finished"
                : `${hiddenCount} done for today. Show them`}
            </button>
          ) : null}
        </section>

        <aside className="flex flex-col gap-4">
          <RunningPanel loops={today.liveLoops} loading={today.liveLoading} />
          <LatelyPanel items={today.lately} loading={today.latelyLoading} />
          <ReportLine overview={today.overview} />
        </aside>
      </div>
    </div>
  );
}
