import type { ChartData, MetricId } from "../contracts/dashboards";
import type { SourceData } from "../hooks/use-analytics-source";

/**
 * Turns endpoint responses into chart-ready data for one measure. Pure, so
 * every measure is unit-tested without rendering. When there is honestly
 * nothing to draw, `emptyReason` says why in a sentence a user can act on.
 */

type Row = Record<string, string | number | null>;

const NO_CONVERSIONS =
  "Choose which on-chain events count as conversions, then this fills in.";

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
};

/** A time bucket's label: its start date, or "Wk of" it for weekly buckets. */
export const bucketLabel = (start: string, grain: "day" | "week") =>
  grain === "week" ? `Wk of ${shortDate(start)}` : shortDate(start);

const empty = (
  categoryKey: string,
  unit: ChartData["unit"],
  emptyReason: string
): ChartData => ({
  categoryKey,
  rows: [],
  series: [],
  unit,
  total: null,
  emptyReason,
});

const pct = (n: number | null | undefined) =>
  typeof n === "number" ? Math.round(n * 1000) / 10 : null;

export function resolveMetric(
  metric: MetricId,
  d: Partial<SourceData>
): ChartData {
  switch (metric) {
    case "reach_over_time": {
      const ts = d.timeseries;
      if (!ts) return empty("bucket", "count", "Loading.");
      const rows = ts.series.map((b) => ({
        bucket: bucketLabel(b.start, ts.grain),
        reach: b.reach ?? 0,
      }));
      return {
        categoryKey: "bucket",
        rows,
        series: [{ key: "reach", label: "Wallets reached" }],
        unit: "count",
        total: d.overview?.kpis.walletsReached.value ?? null,
        ...(rows.every((r) => r.reach === 0)
          ? { emptyReason: "No message reached a wallet in this period." }
          : {}),
      };
    }

    case "conversions_over_time": {
      const ts = d.timeseries;
      if (!ts) return empty("bucket", "count", "Loading.");
      if (
        ts.series.every(
          (b) => b.conversions === null || b.conversions === undefined
        )
      ) {
        return empty("bucket", "count", NO_CONVERSIONS);
      }
      return {
        categoryKey: "bucket",
        rows: ts.series.map((b) => ({
          bucket: bucketLabel(b.start, ts.grain),
          conversions: b.conversions ?? 0,
        })),
        series: [{ key: "conversions", label: "Conversions" }],
        unit: "count",
        total: d.overview?.kpis.onChainConversions.value ?? null,
      };
    }

    case "conversion_rate_over_time": {
      const ts = d.timeseries;
      if (!ts) return empty("bucket", "percent", "Loading.");
      if (
        ts.series.every(
          (b) => b.conversions === null || b.conversions === undefined
        )
      ) {
        return empty("bucket", "percent", NO_CONVERSIONS);
      }
      const rows = ts.series.map((b) => ({
        bucket: bucketLabel(b.start, ts.grain),
        rate:
          b.reach && typeof b.conversions === "number"
            ? Math.round((b.conversions / b.reach) * 1000) / 10
            : null,
      }));
      return {
        categoryKey: "bucket",
        rows,
        series: [{ key: "rate", label: "Conversion rate" }],
        unit: "percent",
        total: null,
      };
    }

    case "messages_by_channel": {
      const c = d.campaigns;
      if (!c) return empty("channel", "count", "Loading.");
      const email = Number(c.email?.sent ?? 0);
      const inapp = Number(c.inapp?.sent ?? 0);
      const rows: Row[] = [
        { channel: "Email", sent: email },
        { channel: "In-app push", sent: inapp },
      ];
      return {
        categoryKey: "channel",
        rows,
        series: [{ key: "sent", label: "Sent" }],
        unit: "count",
        total: c.totals?.messagesSent ?? email + inapp,
        ...(email + inapp === 0
          ? { emptyReason: "Nothing was sent in this period." }
          : {}),
      };
    }

    case "engagement_rates": {
      const c = d.campaigns;
      if (!c) return empty("metric", "percent", "Loading.");
      const e = c.email ?? {};
      const p = c.inapp ?? {};
      const delivered = Number(e.delivered ?? 0) + Number(p.delivered ?? 0);
      if (delivered === 0)
        return empty(
          "metric",
          "percent",
          "Nothing was delivered in this period."
        );
      const rows: Row[] = [
        {
          metric: "Email open rate",
          value: e.openRateOfDelivered ?? e.openRate ?? null,
        },
        { metric: "Push view rate", value: p.viewRate ?? null },
        {
          metric: "Email click rate",
          value: e.clickRateOfDelivered ?? e.clickRate ?? null,
        },
        { metric: "Push click rate", value: p.clickRate ?? null },
        { metric: "Unsubscribe rate", value: e.unsubscribeRate ?? null },
      ].map((r) => ({
        ...r,
        value: typeof r.value === "number" ? r.value : null,
      }));
      return {
        categoryKey: "metric",
        rows,
        series: [{ key: "value", label: "% of delivered" }],
        unit: "percent",
        total: null,
      };
    }

    case "push_funnel": {
      const f = d.push?.funnel;
      if (!f) return empty("stage", "count", "Loading.");
      if (f.queued + f.delivered === 0)
        return empty(
          "stage",
          "count",
          "No in-app push was sent in this period."
        );
      return {
        categoryKey: "stage",
        rows: [
          { stage: "Queued", value: f.queued },
          { stage: "Delivered", value: f.delivered },
          { stage: "Viewed", value: f.viewed },
          { stage: "Clicked", value: f.clicked },
        ],
        series: [{ key: "value", label: "Pushes" }],
        unit: "count",
        total: f.delivered,
      };
    }

    case "segment_engagement": {
      const s = d.segments;
      if (!s) return empty("segment", "percent", "Loading.");
      const rows = s.rows.filter((r) => r.sent > 0);
      if (rows.length === 0)
        return empty("segment", "percent", "No segment has been emailed yet.");
      return {
        categoryKey: "segment",
        rows: rows.slice(0, 12).map((r) => ({
          segment: r.name,
          open: pct(r.openRate),
          click: pct(r.clickRate),
        })),
        series: [
          { key: "open", label: "Open rate" },
          { key: "click", label: "Click rate" },
        ],
        unit: "percent",
        total: null,
      };
    }

    case "conversions_by_event": {
      const a = d.attribution;
      if (!a) return empty("event", "count", "Loading.");
      if (a.conversionEvents.length === 0)
        return empty("event", "count", NO_CONVERSIONS);
      if (a.attributed.byEvent.length === 0) {
        return empty(
          "event",
          "count",
          "No conversion followed a message within the window yet."
        );
      }
      return {
        categoryKey: "event",
        rows: a.attributed.byEvent.map((e) => ({
          event: e.event,
          value: e.count,
        })),
        series: [{ key: "value", label: "Conversions" }],
        unit: "count",
        total: a.attributed.conversions,
      };
    }

    case "new_contacts_by_week": {
      const r = d.audienceReport;
      if (!r) return empty("week", "count", "Loading.");
      if (r.growthWeekly.length === 0)
        return empty("week", "count", "No contacts were added recently.");
      return {
        categoryKey: "week",
        rows: r.growthWeekly.map((g) => ({
          week: bucketLabel(g.weekStart, "week"),
          value: g.newContacts,
        })),
        series: [{ key: "value", label: "New contacts" }],
        unit: "count",
        total: r.growthWeekly.reduce((s, g) => s + g.newContacts, 0),
      };
    }

    case "reachability": {
      const r = d.audienceReport;
      if (!r) return empty("channel", "count", "Loading.");
      if (r.totals.contacts === 0)
        return empty("channel", "count", "No contacts yet.");
      const t = r.totals;
      return {
        categoryKey: "channel",
        rows: [
          { channel: "Email", value: t.emailReachable },
          { channel: "In-app push", value: t.pushReachable },
          { channel: "Both", value: t.bothChannels },
          { channel: "Wallet only", value: t.walletOnly },
        ],
        series: [{ key: "value", label: "Contacts" }],
        unit: "count",
        total: t.contacts,
      };
    }

    case "lifecycle": {
      const a = d.audience;
      if (!a) return empty("stage", "count", "Loading.");
      const rows = [
        { stage: "Active", value: Number(a.activeCount ?? 0) },
        { stage: "Cooling", value: Number(a.coolingCount ?? 0) },
        { stage: "Cold", value: Number(a.coldCount ?? 0) },
      ];
      if (rows.every((r) => r.value === 0))
        return empty("stage", "count", "No contacts have a health score yet.");
      return {
        categoryKey: "stage",
        rows,
        series: [{ key: "value", label: "Contacts" }],
        unit: "count",
        total: Number(a.total ?? rows.reduce((s, r) => s + r.value, 0)),
      };
    }

    case "cohort_retention": {
      const c = d.cohorts;
      if (!c) return empty("week", "percent", "Loading.");
      const curve = retentionCurve(c.cohorts);
      if (curve.length === 0)
        return empty(
          "week",
          "percent",
          "No cohorts yet: contacts need a week to form one."
        );
      return {
        categoryKey: "week",
        rows: curve.map((v, k) => ({
          week: k === 0 ? "Joined" : `Week ${k}`,
          value: v,
        })),
        series: [{ key: "value", label: "Still active" }],
        unit: "percent",
        total: null,
      };
    }

    case "onchain_activity": {
      const o = d.onchain?.onchain;
      if (!o) return empty("metric", "count", "Loading.");
      const rows: Row[] = [{ metric: "New holders", value: o.newHolders }];
      if (o.postMessageConversions !== null)
        rows.push({
          metric: "Actions after a message",
          value: o.postMessageConversions,
        });
      if (o.swaps !== null) rows.push({ metric: "Swaps", value: o.swaps });
      return {
        categoryKey: "metric",
        rows,
        series: [{ key: "value", label: "This period" }],
        unit: "count",
        total: o.newHolders,
        ...(rows.every((r) => r.value === 0)
          ? {
              emptyReason:
                "No on-chain activity from your contracts in this period.",
            }
          : {}),
      };
    }

    case "holders_by_balance": {
      const h = d.holders;
      if (!h) return empty("band", "count", "Loading.");
      if (h.totalHolders === 0)
        return empty(
          "band",
          "count",
          "No holders indexed yet. Index a contract in Integrations."
        );
      return {
        categoryKey: "band",
        rows: h.buckets.map((b) => ({ band: b.range, value: b.wallets })),
        series: [{ key: "value", label: "Wallets" }],
        unit: "count",
        total: h.totalHolders,
      };
    }

    default:
      return empty("x", "count", "Unknown measure.");
  }
}

/**
 * Average retention by weeks since joining, weighted by cohort size: of every
 * contact old enough to have reached week k, the share still active then.
 */
export function retentionCurve(
  cohorts: Array<{ size: number; retained: number[] }>
): number[] {
  const longest = Math.max(0, ...cohorts.map((c) => c.retained.length));
  const out: number[] = [];
  for (let k = 0; k < longest; k++) {
    let active = 0;
    let size = 0;
    for (const c of cohorts) {
      if (c.size > 0 && k < c.retained.length) {
        active += c.retained[k] ?? 0;
        size += c.size;
      }
    }
    if (size > 0) out.push(Math.round((active / size) * 1000) / 10);
  }
  return out;
}
