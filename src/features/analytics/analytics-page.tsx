"use client";

import {
  ArrowDownTrayIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  CalendarIcon,
  ChevronDownIcon,
  CursorArrowRaysIcon,
  EnvelopeOpenIcon,
  InformationCircleIcon,
  MegaphoneIcon,
  PresentationChartLineIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Analytics dashboard, modeled on the reference. Figures are representative
 * sample data - the platform has no aggregate analytics endpoints yet, so the
 * period selector scales illustrative bases rather than querying. Swap the
 * consts below for a service call when the backend lands.
 */

type Period = { id: string; label: string; k: number; days: string };
const PERIODS: Period[] = [
  { id: "7d", label: "Last 7 days", k: 0.28, days: "Daily · last 7 days" },
  { id: "30d", label: "Last 30 days", k: 1, days: "Daily · last 30 days" },
  { id: "90d", label: "Last 90 days", k: 2.7, days: "Weekly · last 90 days" },
];

type Kpi = {
  label: string;
  base: number;
  suffix: string;
  delta: string;
  up: boolean;
  flat?: boolean;
  hint: string;
};
const KPIS: Kpi[] = [
  {
    label: "Wallets reached",
    base: 18204,
    suffix: "",
    delta: "+12.4%",
    up: true,
    hint: "Unique wallets sent at least one email or in-app push in the period.",
  },
  {
    label: "Email open rate",
    base: 42.3,
    suffix: "%",
    flat: true,
    delta: "+3.1pt",
    up: true,
    hint: "Share of delivered emails opened. Email only - in-app push is measured as view rate.",
  },
  {
    label: "Push view rate",
    base: 90.6,
    suffix: "%",
    flat: true,
    delta: "+1.8pt",
    up: true,
    hint: "Share of delivered in-app pushes that were seen. High because a queued message waits for the wallet rather than competing in an inbox.",
  },
  {
    label: "Active wallets",
    base: 9412,
    suffix: "",
    delta: "+8.6%",
    up: true,
    hint: "Wallets in your audience with at least one on-chain action in the period.",
  },
  {
    label: "On-chain conversions",
    base: 1164,
    suffix: "",
    delta: "+22.8%",
    up: true,
    hint: "Wallets that took a target on-chain action within the attribution window after a message.",
  },
];

type Bar = { name: string; value: string; pct: number; hint: string };
const OFFCHAIN: Bar[] = [
  {
    name: "Email open rate",
    value: "42.3%",
    pct: 82,
    hint: "Share of delivered emails that were opened.",
  },
  {
    name: "Push view rate",
    value: "38.6%",
    pct: 74,
    hint: "Share of delivered in-app pushes actually seen on screen.",
  },
  {
    name: "Click-through rate (CTR)",
    value: "11.8%",
    pct: 28,
    hint: "Share of delivered emails where someone clicked a link.",
  },
  {
    name: "Unsubscribe rate",
    value: "0.4%",
    pct: 4,
    hint: "Share of delivered emails that led to an opt-out. Above ~0.5% is worth investigating.",
  },
];
const ONCHAIN: Bar[] = [
  {
    name: "New holders",
    value: "1,204",
    pct: 68,
    hint: "Wallets that acquired the token or NFT for the first time this period.",
  },
  {
    name: "Swaps",
    value: "842",
    pct: 48,
    hint: "Token swaps made by wallets in your audience.",
  },
  {
    name: "Post-message conversions",
    value: "1,164",
    pct: 66,
    hint: "On-chain actions taken within the attribution window after receiving a message.",
  },
  {
    name: "30d retention",
    value: "54.2%",
    pct: 54,
    hint: "Share of wallets still active on-chain 30 days after their first tracked action.",
  },
];

const FUNNEL = [
  {
    name: "Queued",
    value: 24800,
    hint: "Wallets the campaign was enqueued for.",
  },
  {
    name: "Delivered",
    value: 18120,
    hint: "Fired when the wallet next connected.",
  },
  { name: "Viewed", value: 16420, hint: "Actually seen on screen." },
  { name: "Clicked", value: 4980, hint: "Tapped the call to action." },
];
const FUNNEL_SECONDARY = [
  {
    name: "Still pending",
    value: 4240,
    tone: "info" as const,
    hint: "Queued, not yet connected. Can still deliver.",
  },
  {
    name: "Expired unseen",
    value: 2440,
    tone: "warn" as const,
    hint: "TTL elapsed before the wallet returned.",
  },
];
const MEDIAN_TTL = "1.4 days";

const SERIES_REACH = [22, 30, 26, 38, 34, 46, 42, 55, 50, 63, 58, 72];
const SERIES_CONV = [12, 16, 15, 20, 19, 26, 24, 30, 28, 36, 33, 42];

const TEMPLATES = [
  {
    Icon: UsersIcon,
    name: "Holder distribution",
    desc: "Balances, concentration and top wallets by token.",
    tag: "On-chain",
  },
  {
    Icon: PresentationChartLineIcon,
    name: "Retention cohorts",
    desc: "Weekly wallet retention since first interaction.",
    tag: "On-chain",
  },
  {
    Icon: EnvelopeOpenIcon,
    name: "Engagement by segment",
    desc: "Open, click and push-view rates per audience.",
    tag: "Off-chain",
  },
  {
    Icon: CursorArrowRaysIcon,
    name: "Conversion attribution",
    desc: "On-chain actions mapped back to campaigns and flows.",
    tag: "Blended",
  },
  {
    Icon: MegaphoneIcon,
    name: "Campaign report",
    desc: "Delivery, engagement and conversion per campaign.",
    tag: "Off-chain",
  },
  {
    Icon: BoltIcon,
    name: "Automation performance",
    desc: "Entries, completion and conversion by flow.",
    tag: "Blended",
  },
];
const PINNED: [string, string][] = [
  ["Top $VAULT holders by chain", "Pinned Jul 22 · refreshes daily"],
  ["Whale unstake watch", "Pinned Jul 20 · refreshes hourly"],
  ["Season 2 buyer engagement", "Pinned Jul 19 · refreshes daily"],
];

const points = (d: number[], h = 200, w = 560) =>
  d.map((v, i) => `${(i / (d.length - 1)) * w},${h - (v / 80) * h}`).join(" ");

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>(PERIODS[1]);
  const [open, setOpen] = useState(false);

  const kpis = useMemo(
    () =>
      KPIS.map((k) => ({
        ...k,
        display: k.flat
          ? `${k.base.toFixed(1)}${k.suffix}`
          : Math.round(k.base * period.k).toLocaleString("en-US") + k.suffix,
      })),
    [period]
  );

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ["Metric", "Value", "Period"],
      ...kpis.map((k) => [k.label, k.display, period.label]),
      [],
      ["Off-chain engagement", "Value"],
      ...OFFCHAIN.map((b) => [b.name, b.value]),
      [],
      ["On-chain activity", "Value"],
      ...ONCHAIN.map((b) => [b.name, b.value]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `onchainsuite-analytics-${period.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={open}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
            >
              <CalendarIcon
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              {period.label}
              <ChevronDownIcon
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </button>
            {open ? (
              <ul
                role="listbox"
                className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-md"
              >
                {PERIODS.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={p.id === period.id}
                      onClick={() => {
                        setPeriod(p);
                        setOpen(false);
                      }}
                      className={cn(
                        "block w-full px-3 py-1.5 text-left text-sm hover:bg-muted",
                        p.id === period.id
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            <ArrowDownTrayIcon className="size-4" aria-hidden="true" />
            Export report
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-border/60 bg-card/60 p-4"
          >
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {k.label}
              <Info hint={k.hint} />
            </div>
            <p className="mt-1.5 text-2xl font-semibold text-foreground">
              {k.display}
            </p>
            <p
              className={cn(
                "mt-1 inline-flex items-center gap-1 text-xs font-medium",
                k.up
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {k.up ? (
                <ArrowTrendingUpIcon className="size-3.5" aria-hidden="true" />
              ) : (
                <ArrowTrendingDownIcon
                  className="size-3.5"
                  aria-hidden="true"
                />
              )}
              {k.delta}
            </p>
          </div>
        ))}
      </div>

      {/* Reach & conversions over time */}
      <Card
        title="Reach & conversions over time"
        right={
          <span className="text-xs text-muted-foreground">{period.days}</span>
        }
      >
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Legend color="var(--primary)">Wallets reached · off-chain</Legend>
          <Legend color="#f97316" dashed>
            On-chain conversions
          </Legend>
        </div>
        <svg
          viewBox="0 0 560 200"
          preserveAspectRatio="none"
          className="h-48 w-full"
          role="img"
          aria-label="Reach and conversions trend"
        >
          <defs>
            <linearGradient id="an-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--primary)" stopOpacity="0.18" />
              <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            fill="url(#an-grad)"
            points={`0,200 ${points(SERIES_REACH)} 560,200`}
          />
          <polyline
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            points={points(SERIES_REACH)}
          />
          <polyline
            fill="none"
            stroke="#f97316"
            strokeWidth="2.5"
            strokeDasharray="4 4"
            points={points(SERIES_CONV)}
          />
        </svg>
      </Card>

      {/* Off-chain + On-chain */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Off-chain engagement"
          right={
            <Info hint="Email and in-app push performance for messages you sent." />
          }
        >
          <HBars
            bars={OFFCHAIN}
            color="var(--primary)"
            legend="Messaging · % of delivered"
          />
        </Card>
        <Card
          title="On-chain activity"
          right={
            <Info hint="What wallets in your audience did on-chain over the period." />
          }
        >
          <HBars
            bars={ONCHAIN}
            color="#f97316"
            legend="Wallet activity · on-chain"
          />
        </Card>
      </div>

      {/* Push delivery */}
      <Card
        title="In-app push delivery"
        right={
          <span className="text-xs text-muted-foreground">
            Median time to view · {MEDIAN_TTL}
          </span>
        }
      >
        <div className="grid gap-3 sm:grid-cols-4">
          {FUNNEL.map((f, i) => {
            const pct = Math.round((f.value / FUNNEL[0].value) * 100);
            return (
              <div
                key={f.name}
                className="rounded-xl border border-border/60 p-3"
                title={f.hint}
              >
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  {f.name}
                  <Info hint={f.hint} />
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {f.value.toLocaleString()}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background:
                        i === FUNNEL.length - 1 ? "#f97316" : "var(--primary)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          {FUNNEL_SECONDARY.map((s) => (
            <span
              key={s.name}
              className="inline-flex items-center gap-1.5"
              title={s.hint}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  s.tone === "warn" ? "bg-amber-500" : "bg-sky-500"
                )}
              />
              <span className="text-muted-foreground">
                {s.name} ·{" "}
                <span className="font-medium text-foreground">
                  {s.value.toLocaleString()}
                </span>
              </span>
            </span>
          ))}
        </div>
      </Card>

      {/* Report templates */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Report templates
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map(({ Icon, name, desc, tag }) => (
            <div
              key={name}
              className="flex flex-col rounded-xl border border-border/60 bg-card/60 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {tag}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {name}
              </p>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                {desc}
              </p>
              <div className="mt-3 flex gap-2">
                <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                  Run report
                </button>
                <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                  Export
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pinned from Intelligence */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Pinned from Intelligence
        </h2>
        <div className="overflow-hidden rounded-xl border border-border/60">
          {PINNED.map(([name, meta], i) => (
            <div
              key={name}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-3",
                i > 0 && "border-t border-border/40"
              )}
            >
              <div>
                <p className="text-sm font-medium text-foreground">{name}</p>
                <p className="text-xs text-muted-foreground">{meta}</p>
              </div>
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                Run report
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function HBars({
  bars,
  color,
  legend,
}: {
  bars: Bar[];
  color: string;
  legend: string;
}) {
  return (
    <div>
      <div className="mb-3">
        <Legend color={color}>{legend}</Legend>
      </div>
      <div className="space-y-3.5">
        {bars.map((b) => (
          <div key={b.name}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                {b.name}
                <Info hint={b.hint} />
              </span>
              <span className="font-medium text-foreground">{b.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${b.pct}%`, background: color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({
  color,
  dashed,
  children,
}: {
  color: string;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className="inline-block h-0.5 w-4 rounded-full"
        style={
          dashed
            ? {
                backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 8px)`,
              }
            : { background: color }
        }
      />
      {children}
    </span>
  );
}

function Info({ hint }: { hint: string }) {
  return (
    <span title={hint} className="cursor-help text-muted-foreground/70">
      <InformationCircleIcon className="size-3.5" aria-hidden="true" />
    </span>
  );
}
