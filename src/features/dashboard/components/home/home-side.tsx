"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { formatRelativeTime } from "@/lib/date";

import type { DashboardOverview } from "@/features/analytics/analytics.service";
import type { LoopRow } from "@/features/automation/utils/loop-rows";
import { resolveNotificationMeta } from "@/features/notifications/notification-meta";
import type { NotificationItem } from "@/features/notifications/notifications.service";
import { Icon } from "@/shared/components/common/hugeicon";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const PANEL =
  "rounded-xl border border-(--border-subtle) bg-card shadow-(--elevation-xs)";

function PanelHead({
  title,
  more,
}: {
  title: string;
  more?: { label: string; href: string };
}) {
  return (
    <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
      <h2 className="text-sm font-semibold text-(--text-primary)">{title}</h2>
      {more ? (
        <Link
          href={more.href}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
        >
          {more.label}
          <Icon icon={ArrowRight01Icon} className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

/** What runs without you: the live Loops. */
export function RunningPanel({
  loops,
  loading,
}: {
  loops: LoopRow[];
  loading: boolean;
}) {
  return (
    <section className={PANEL} aria-label="Running on its own">
      <PanelHead
        title="Running on its own"
        more={{ label: "Loops", href: PRIVATE_ROUTES.AUTOMATIONS }}
      />
      {loading ? (
        <div className="space-y-2 px-4 pb-4" aria-hidden="true">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      ) : loops.length === 0 ? (
        <p className="px-4 pb-4 text-[13px] leading-normal text-(--text-tertiary)">
          No Loop is live. A Loop sends the right message when someone does
          something, without you.
        </p>
      ) : (
        <ul className="pb-2">
          {loops.map((loop) => {
            const entered = loop.entries + loop.optInEmailsSent;
            return (
              <li key={loop.id}>
                <Link
                  href={`/automations/${loop.id}`}
                  className="flex items-center gap-2.5 px-4 py-2 text-[13.5px] hover:bg-(--tint-hover)"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full bg-(--status-success-border)"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-(--text-primary)">
                    {loop.name}
                  </span>
                  {entered > 0 ? (
                    <span className="shrink-0 text-xs text-(--text-tertiary) tabular-nums">
                      {entered.toLocaleString("en-US")} in 30 days
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** What happened lately: the newest few notifications, the bell's own feed. */
export function LatelyPanel({
  items,
  loading,
}: {
  items: NotificationItem[];
  loading: boolean;
}) {
  if (!loading && items.length === 0) return null;
  return (
    <section className={PANEL} aria-label="Lately">
      <PanelHead title="Lately" />
      {loading ? (
        <div className="space-y-2 px-4 pb-4" aria-hidden="true">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        </div>
      ) : (
        <ul className="pb-2">
          {items.map((n) => {
            const meta = resolveNotificationMeta(n.type);
            const text = n.title ?? n.message ?? "Something happened";
            return (
              <li key={n.id} className="flex items-start gap-2.5 px-4 py-2">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-(--tint-hover) text-(--text-secondary)">
                  <meta.icon aria-hidden="true" className="size-3.5" />
                </span>
                <span className="min-w-0 text-[13px] leading-snug text-(--text-secondary)">
                  {text}
                  {n.createdAt ? (
                    <time
                      dateTime={n.createdAt}
                      className="mt-0.5 block text-xs text-(--text-tertiary)"
                    >
                      {formatRelativeTime(n.createdAt)}
                    </time>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** The numbers, as one sentence with the way through to Analytics. */
export function ReportLine({ overview }: { overview?: DashboardOverview }) {
  if (!overview) return null;
  const sent = overview.messagesSent.value;
  const converted = overview.convertedOnchain.value;
  if (!sent && !converted) return null;
  return (
    <p className="px-1 text-[13px] leading-relaxed text-(--text-secondary) [&_b]:font-semibold [&_b]:text-(--text-primary)">
      In the last 30 days you sent{" "}
      <b>{sent.toLocaleString("en-US")} messages</b>
      {converted > 0 ? (
        <>
          , and <b>{converted.toLocaleString("en-US")}</b> people converted on
          chain afterwards
        </>
      ) : null}
      .{" "}
      <Link
        href={PRIVATE_ROUTES.ANALYTICS}
        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
      >
        See how that is trending
        <Icon icon={ArrowRight01Icon} className="size-3.5" />
      </Link>
    </p>
  );
}
