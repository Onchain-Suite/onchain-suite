import { isJsonObject } from "@/lib/utils";

import type {
  AnalyticsPeriod,
  KpiValue,
  OrgAnalyticsOverview,
  OrgAnalyticsTimeseries,
  OrgAttribution,
  OrgOnchainActivity,
  OrgPushDelivery,
} from "../contracts/org-analytics";
import type {
  AudienceReport,
  EngagementBySegmentReport,
  HolderDistributionReport,
  RetentionCohortsReport,
} from "../contracts/reports";

/*
 * Coercion for analytics responses, so a missing or malformed field becomes
 * an honest `null` or empty list instead of a crash or a fake zero. Pure.
 */

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (isJsonObject(v) ? v : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** A finite number, else null. Numeric strings count. */
export const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
};
const count = (v: unknown): number => num(v) ?? 0;

const PERIODS: AnalyticsPeriod[] = ["7d", "30d", "90d"];
const period = (v: unknown, fallback: AnalyticsPeriod): AnalyticsPeriod =>
  PERIODS.includes(v as AnalyticsPeriod) ? (v as AnalyticsPeriod) : fallback;

const notes = (v: unknown): string[] =>
  arr(obj(v).notes).filter((n): n is string => typeof n === "string");

const kpi = (v: unknown): KpiValue => {
  const o = obj(v);
  return {
    value: num(o.value),
    previous: num(o.previous),
    changePct: num(o.changePct),
  };
};

export function toOverview(
  raw: unknown,
  fallback: AnalyticsPeriod
): OrgAnalyticsOverview {
  const o = obj(raw);
  const k = obj(o.kpis);
  const w = obj(o.window);
  return {
    period: period(o.period, fallback),
    window: { start: str(w.start), end: str(w.end) },
    kpis: {
      walletsReached: kpi(k.walletsReached),
      emailOpenRate: kpi(k.emailOpenRate),
      pushViewRate: kpi(k.pushViewRate),
      activeWallets: kpi(k.activeWallets),
      onChainConversions: kpi(k.onChainConversions),
    },
    meta: { notes: notes(o.meta) },
  };
}

export function toTimeseries(
  raw: unknown,
  fallback: AnalyticsPeriod
): OrgAnalyticsTimeseries {
  const o = obj(raw);
  return {
    period: period(o.period, fallback),
    grain: o.grain === "week" ? "week" : "day",
    metrics: arr(o.metrics).filter(
      (m): m is "reach" | "conversions" => m === "reach" || m === "conversions"
    ),
    series: arr(o.series).map((b) => {
      const p = obj(b);
      return {
        bucket: str(p.bucket),
        start: str(p.start),
        end: str(p.end),
        ...(p.reach !== undefined ? { reach: count(p.reach) } : {}),
        ...(p.conversions !== undefined
          ? { conversions: num(p.conversions) }
          : {}),
      };
    }),
    meta: { notes: notes(o.meta) },
  };
}

export function toPushDelivery(
  raw: unknown,
  fallback: AnalyticsPeriod
): OrgPushDelivery {
  const o = obj(raw);
  const f = obj(o.funnel);
  const r = obj(o.rates);
  return {
    period: period(o.period, fallback),
    funnel: {
      queued: count(f.queued),
      delivered: count(f.delivered),
      viewed: count(f.viewed),
      clicked: count(f.clicked),
      stillPending: count(f.stillPending),
      expiredUnseen: count(f.expiredUnseen),
      medianTimeToView: num(f.medianTimeToView),
    },
    rates: {
      deliveryRate: num(r.deliveryRate),
      viewRate: num(r.viewRate),
      clickRate: num(r.clickRate),
    },
    meta: { notes: notes(o.meta) },
  };
}

export function toOnchain(
  raw: unknown,
  fallback: AnalyticsPeriod
): OrgOnchainActivity {
  const o = obj(raw);
  const c = obj(o.onchain);
  return {
    period: period(o.period, fallback),
    onchain: {
      newHolders: count(c.newHolders),
      newHoldersChangePct: num(c.newHoldersChangePct),
      swaps: num(c.swaps),
      postMessageConversions: num(c.postMessageConversions),
      retention30d: num(c.retention30d),
    },
    meta: { notes: notes(o.meta) },
  };
}

export function toAttribution(
  raw: unknown,
  fallback: AnalyticsPeriod
): OrgAttribution {
  const o = obj(raw);
  const a = obj(o.attributed);
  return {
    period: period(o.period, fallback),
    windowHours: num(o.windowHours) ?? 72,
    conversionEvents: arr(o.conversionEvents).filter(
      (e): e is string => typeof e === "string"
    ),
    attributed: {
      conversions: num(a.conversions),
      wallets: num(a.wallets),
      byEvent: arr(a.byEvent)
        .map((e) => ({ event: str(obj(e).event), count: count(obj(e).count) }))
        .filter((e) => e.event),
    },
    meta: { notes: notes(o.meta) },
  };
}

export function toCohorts(raw: unknown): RetentionCohortsReport {
  return {
    cohorts: arr(obj(raw).cohorts).map((c) => {
      const o = obj(c);
      return {
        cohortWeek: str(o.cohortWeek),
        size: count(o.size),
        retained: arr(o.retained).map(count),
      };
    }),
  };
}

export function toSegmentEngagement(raw: unknown): EngagementBySegmentReport {
  return {
    rows: arr(obj(raw).rows).map((r) => {
      const o = obj(r);
      return {
        segmentId: str(o.segmentId),
        name: str(o.name) || "Untitled segment",
        sent: count(o.sent),
        openRate: count(o.openRate),
        clickRate: count(o.clickRate),
        pushViewRate: count(o.pushViewRate),
      };
    }),
  };
}

export function toHolderDistribution(raw: unknown): HolderDistributionReport {
  const o = obj(raw);
  const c = obj(o.concentration);
  return {
    buckets: arr(o.buckets).map((b) => ({
      range: str(obj(b).range),
      wallets: count(obj(b).wallets),
      pctSupply: count(obj(b).pctSupply),
    })),
    topHolders: arr(o.topHolders).map((h) => ({
      wallet: str(obj(h).wallet),
      balance: count(obj(h).balance),
      pctSupply: count(obj(h).pctSupply),
    })),
    concentration: { top10Pct: count(c.top10Pct), hhi: count(c.hhi) },
    totalHolders: count(o.totalHolders),
    totalSupply: count(o.totalSupply),
  };
}

export function toAudienceReport(raw: unknown): AudienceReport {
  const o = obj(raw);
  const t = obj(o.totals);
  return {
    totals: {
      contacts: count(t.contacts),
      pushReachable: count(t.pushReachable),
      emailReachable: count(t.emailReachable),
      walletOnly: count(t.walletOnly),
      bothChannels: count(t.bothChannels),
    },
    growthWeekly: arr(o.growthWeekly).map((g) => ({
      weekStart: str(obj(g).weekStart),
      newContacts: count(obj(g).newContacts),
    })),
    engagement30d: arr(o.engagement30d).map((e) => ({
      eventType: str(obj(e).eventType),
      count: count(obj(e).count),
    })),
    topSegments: arr(o.topSegments).map((s) => ({
      id: str(obj(s).id),
      name: str(obj(s).name),
      count: count(obj(s).count),
    })),
    updatedAt: str(o.updatedAt) || undefined,
  };
}
