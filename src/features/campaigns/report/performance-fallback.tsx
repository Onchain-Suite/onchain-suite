"use client";

import {
  DevicePhoneMobileIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

import type { CampaignAnalytics } from "../campaigns.service";

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const fmtCount = (v?: number) => (isNum(v) ? v.toLocaleString() : "-");
const fmtPct = (v?: number) => (isNum(v) ? `${v.toFixed(1)}%` : "-");

/**
 * The email / in-app table the campaign page showed before the per-channel
 * report. Kept as the fallback for a server without
 * GET /campaigns/:id/channel-report.
 */
export function PerformanceByChannel({
  analytics,
  channels,
  loading,
  error,
  onRetry,
}: {
  analytics: CampaignAnalytics | undefined;
  channels: { email: boolean; inapp: boolean };
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const email = analytics?.email;
  const inapp = analytics?.inapp;
  const rows: {
    key: string;
    label: string;
    icon: typeof EnvelopeIcon;
    sent?: number;
    engagedRate?: number;
    clickRate?: number;
  }[] = [];
  // Gate on the channels the campaign actually uses, NOT on funnel presence -
  // so an email-only send never shows a zeroed in-app row (and vice versa).
  if (channels.email) {
    rows.push({
      key: "email",
      label: "Email",
      icon: EnvelopeIcon,
      sent: email?.sent,
      // Same rule as the headline and the list — see engagement-rates.ts.
      // Reading the deprecated `openRate` here showed the of-sent number in
      // this table beside an of-delivered headline on the SAME page.
      engagedRate:
        email?.openRateOfDelivered ??
        email?.openRateOfAudience ??
        email?.openRate,
      clickRate:
        email?.clickRateOfDelivered ??
        email?.clickRateOfAudience ??
        email?.clickRate,
    });
  }
  if (channels.inapp) {
    rows.push({
      key: "inapp",
      label: "In-app push",
      icon: DevicePhoneMobileIcon,
      sent: inapp?.sent,
      engagedRate: inapp?.viewRate,
      clickRate: inapp?.clickRate,
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">
        Performance by channel
      </h2>
      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <div className="space-y-2">
            <div className="h-10 animate-pulse rounded-lg bg-muted/60" />
            <div className="h-12 animate-pulse rounded-lg bg-muted/40" />
          </div>
        ) : error ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm text-primary hover:underline"
          >
            Couldn&apos;t load analytics - retry
          </button>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No channel analytics yet.
          </p>
        ) : (
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Channel</th>
                <th className="px-4 py-2 font-medium">Sent</th>
                <th className="px-4 py-2 font-medium">Opened / viewed</th>
                <th className="px-4 py-2 font-medium">Clicked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2 text-foreground">
                      <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <r.icon className="size-4" aria-hidden="true" />
                      </span>
                      {r.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {fmtCount(r.sent)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">
                      {fmtPct(r.engagedRate)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">
                      {fmtPct(r.clickRate)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Measured against everyone this campaign was sent to. Click rate is
        against recipients, not against opens.
      </p>
    </section>
  );
}
