import { isJsonObject } from "@/lib/utils";

import { request } from "../dm-send/dm-send.service";

/** A number, or null with why the platform can't give it. */
export interface Measured {
  value: number | null;
  note?: string;
}

export interface ChannelReportRow {
  channel: string;
  delivery: "message" | "dm" | "post" | "channel_post" | "notification";
  sent: number;
  delivered: Measured;
  failed: number;
  bounced: Measured;
  unsubscribed: Measured;
  opened: Measured;
  clicked: Measured;
  reach: Measured;
  rates: {
    delivery: number | null;
    open: number | null;
    click: number | null;
    unsubscribe: number | null;
  };
}

export interface RealAccounts {
  channel: string;
  total: number;
  scored: number;
  sampled: boolean;
  likelyReal: number;
  unclear: number;
  likelyFake: number;
  fakeReasons: Array<{ reason: string; count: number }>;
}

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;
const rateOf = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

function measured(v: unknown): Measured {
  if (!isJsonObject(v)) return { value: null };
  const value =
    typeof v.value === "number" && Number.isFinite(v.value) ? v.value : null;
  return typeof v.note === "string" && v.note
    ? { value, note: v.note }
    : { value };
}

const DELIVERIES = new Set([
  "message",
  "dm",
  "post",
  "channel_post",
  "notification",
]);

/** Normalise GET /campaigns/:id/channel-report. Junk rows are dropped. */
export function toChannelReport(raw: unknown): ChannelReportRow[] {
  const list =
    isJsonObject(raw) && Array.isArray(raw.channels) ? raw.channels : [];
  return list.filter(isJsonObject).flatMap((r) => {
    if (typeof r.channel !== "string" || !DELIVERIES.has(String(r.delivery))) {
      return [];
    }
    const rates = isJsonObject(r.rates) ? r.rates : {};
    return [
      {
        channel: r.channel,
        delivery: r.delivery as ChannelReportRow["delivery"],
        sent: num(r.sent),
        delivered: measured(r.delivered),
        failed: num(r.failed),
        bounced: measured(r.bounced),
        unsubscribed: measured(r.unsubscribed),
        opened: measured(r.opened),
        clicked: measured(r.clicked),
        reach: measured(r.reach),
        rates: {
          delivery: rateOf(rates.delivery),
          open: rateOf(rates.open),
          click: rateOf(rates.click),
          unsubscribe: rateOf(rates.unsubscribe),
        },
      },
    ];
  });
}

/** Normalise GET /campaigns/:id/real-accounts into a channel -> summary map. */
export function toRealAccounts(raw: unknown): Map<string, RealAccounts> {
  const list =
    isJsonObject(raw) && Array.isArray(raw.channels) ? raw.channels : [];
  const out = new Map<string, RealAccounts>();
  for (const r of list.filter(isJsonObject)) {
    if (typeof r.channel !== "string") continue;
    out.set(r.channel, {
      channel: r.channel,
      total: num(r.total),
      scored: num(r.scored),
      sampled: r.sampled === true,
      likelyReal: num(r.likelyReal),
      unclear: num(r.unclear),
      likelyFake: num(r.likelyFake),
      fakeReasons: (Array.isArray(r.fakeReasons) ? r.fakeReasons : [])
        .filter(isJsonObject)
        .map((x) => ({ reason: String(x.reason ?? ""), count: num(x.count) }))
        .filter((x) => x.reason),
    });
  }
  return out;
}

export const channelReportService = {
  async report(campaignId: string) {
    return toChannelReport(
      await request({
        method: "GET",
        url: `/campaigns/${campaignId}/channel-report`,
      })
    );
  },
  async realAccounts(campaignId: string) {
    return toRealAccounts(
      await request({
        method: "GET",
        url: `/campaigns/${campaignId}/real-accounts`,
      })
    );
  },
};
