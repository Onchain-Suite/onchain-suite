import type { BuiltInDashboardId } from "../contracts/dashboards";

/*
 * The default dashboards, as the 2.7 reference groups them (7 Nov 2026).
 * The four built-in tabs read as two dashboards: Growth (is the marketing
 * working: reach, engagement, conversions) and Retention (who is staying).
 * Routes are unchanged: each tab is still /analytics/<tab>.
 *
 * The reference's third default, Onchain, is not here: it needs value-locked
 * and holder series the analytics API does not return yet.
 */

export type DefaultDashboardId = "growth" | "retention";

export interface DefaultDashboard {
  id: DefaultDashboardId;
  name: string;
  desc: string;
  tabs: { id: BuiltInDashboardId; label: string }[];
}

export const DEFAULT_DASHBOARDS: DefaultDashboard[] = [
  {
    id: "growth",
    name: "Growth",
    desc: "Your marketing: what your campaigns and Loops reached, delivered, opened and clicked, and what people did afterwards.",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "engagement", label: "Engagement" },
      { id: "conversions", label: "Conversions" },
    ],
  },
  {
    id: "retention",
    name: "Retention",
    desc: "Who is staying: who is active, who came back, and how each cohort holds up.",
    tabs: [{ id: "retention", label: "Retention" }],
  },
];

/** The default dashboard a built-in tab belongs to. */
export function defaultFor(tab: string): DefaultDashboard | undefined {
  return DEFAULT_DASHBOARDS.find((d) => d.tabs.some((t) => t.id === tab));
}

const count = (n: number) => n.toLocaleString("en-US");
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

/**
 * A default's headline for the last 30 days, from `/dashboard/overview`, as
 * parts the card bolds. Empty when the overview is missing or all zero, so a
 * card never claims "0 sent" before anything has been measured.
 */
export function headlineFor(
  id: DefaultDashboardId,
  o:
    | {
        messagesSent: { value: number };
        openRate: { value: number };
        activeWallets: { value: number };
        convertedOnchain: { value: number };
      }
    | undefined
): { value: string; label: string }[] {
  if (!o) return [];
  if (id === "growth") {
    if (!o.messagesSent.value) return [];
    return [
      { value: count(o.messagesSent.value), label: "sent" },
      { value: pct(o.openRate.value), label: "opened" },
    ];
  }
  const parts = [
    o.activeWallets.value
      ? { value: count(o.activeWallets.value), label: "active wallets" }
      : null,
    o.convertedOnchain.value
      ? { value: count(o.convertedOnchain.value), label: "converted on chain" }
      : null,
  ];
  return parts.filter((p): p is { value: string; label: string } => !!p);
}

/** "3 charts", "No charts yet". */
export const chartsLabel = (n: number) =>
  n === 0 ? "No charts yet" : `${n} chart${n === 1 ? "" : "s"}`;
