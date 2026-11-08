"use client";

import { useQuery } from "@tanstack/react-query";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { CampaignAnalytics } from "../campaigns.service";
import {
  type ChannelReportRow,
  channelReportService,
  type Measured,
  type RealAccounts,
} from "./channel-report.service";
import { PerformanceByChannel } from "./performance-fallback";

const NAME: Record<string, string> = {
  email: "Email",
  inapp: "In-app push",
  sms: "SMS",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  x: "X",
  discord: "Discord",
  farcaster: "Farcaster",
};

/** "Telegram DMs", "X posts", "Telegram channel", "Farcaster notifications". */
export function rowLabel(r: Pick<ChannelReportRow, "channel" | "delivery">) {
  const name = NAME[r.channel] ?? r.channel;
  switch (r.delivery) {
    case "dm":
      return `${name} DMs`;
    case "post":
      return `${name} posts`;
    case "channel_post":
      return `${name} channel`;
    case "notification":
      return `${name} notifications`;
    default:
      return name;
  }
}

const count = (n: number) => n.toLocaleString();
const pct = (n: number | null) => (n === null ? null : `${n.toFixed(1)}%`);

function Unknown({ note }: { note?: string }) {
  if (!note) return <span className="text-muted-foreground">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="cursor-help text-muted-foreground underline decoration-dotted underline-offset-4"
          aria-label={`Not available: ${note}`}
        >
          —
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{note}</TooltipContent>
    </Tooltip>
  );
}

function MetricCell({ m, rate }: { m: Measured; rate?: number | null }) {
  if (m.value === null) return <Unknown note={m.note} />;
  const shown = pct(rate ?? null);
  return (
    <span className="flex flex-col">
      <span className="tabular-nums text-foreground">{count(m.value)}</span>
      {shown ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {shown}
        </span>
      ) : null}
      {m.note ? <span className="sr-only">Note: {m.note}</span> : null}
    </span>
  );
}

function DeliveredCell({ r }: { r: ChannelReportRow }) {
  if (r.delivered.value === null && r.reach.value !== null) {
    return (
      <span className="flex flex-col">
        <span className="tabular-nums text-foreground">
          {count(r.reach.value)}
        </span>
        <span className="text-xs text-muted-foreground">subscribers</span>
      </span>
    );
  }
  return <MetricCell m={r.delivered} rate={r.rates.delivery} />;
}

function RealCell({ real }: { real: RealAccounts | undefined }) {
  if (!real || real.scored === 0)
    return <span className="text-muted-foreground">—</span>;
  const reasons = real.fakeReasons
    .map((x) => `${x.reason} (${x.count.toLocaleString()})`)
    .join(" · ");
  const body = (
    <span className="flex flex-col">
      <span className="tabular-nums text-foreground">
        {count(real.likelyReal)} real
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">
        {count(real.likelyFake)} likely fake
        {real.sampled ? ` · of ${count(real.scored)} checked` : ""}
      </span>
    </span>
  );
  if (!reasons) return body;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="cursor-help">
          {body}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        Why some look fake: {reasons}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Results per channel: sent, delivered, failed, unsubscribed, opened, clicked,
 * and how many recipients look like real people. A metric the platform doesn't
 * report shows a dash with the reason on hover, never a misleading 0%. Falls
 * back to the email / in-app table when the report isn't on this server yet.
 */
export function ChannelReportSection({
  campaignId,
  analytics,
  channels,
  loading,
  error,
  onRetry,
}: {
  campaignId: string;
  analytics: CampaignAnalytics | undefined;
  channels: { email: boolean; inapp: boolean };
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const report = useQuery({
    queryKey: ["campaigns", campaignId, "channel-report"],
    retry: false,
    staleTime: 30_000,
    queryFn: () => channelReportService.report(campaignId),
  });
  const real = useQuery({
    queryKey: ["campaigns", campaignId, "real-accounts"],
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: () => channelReportService.realAccounts(campaignId),
  });

  if (report.isError) {
    return (
      <PerformanceByChannel
        analytics={analytics}
        channels={channels}
        loading={loading}
        error={error}
        onRetry={onRetry}
      />
    );
  }

  const rows = report.data ?? [];

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">
        Performance by channel
      </h2>
      <div className="mt-4 overflow-x-auto">
        {report.isPending ? (
          <div className="space-y-2">
            <div className="h-10 animate-pulse rounded-lg bg-muted/60" />
            <div className="h-12 animate-pulse rounded-lg bg-muted/40" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing has been sent on any channel yet.
          </p>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium">Sent</th>
                <th className="px-3 py-2 font-medium">Delivered</th>
                <th className="px-3 py-2 font-medium">Failed</th>
                <th className="px-3 py-2 font-medium">Unsubscribed</th>
                <th className="px-3 py-2 font-medium">Opened</th>
                <th className="px-3 py-2 font-medium">Clicked</th>
                <th className="px-3 py-2 font-medium">Real accounts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.channel}:${r.delivery}`}
                  className="border-b border-border align-top last:border-0"
                >
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {rowLabel(r)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-foreground">
                    {count(r.sent)}
                  </td>
                  <td className="px-3 py-3">
                    <DeliveredCell r={r} />
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex flex-col">
                      <span className="tabular-nums text-foreground">
                        {count(r.failed)}
                      </span>
                      {r.bounced.value !== null ? (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {count(r.bounced.value)} bounced
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <MetricCell m={r.unsubscribed} rate={r.rates.unsubscribe} />
                  </td>
                  <td className="px-3 py-3">
                    <MetricCell m={r.opened} rate={r.rates.open} />
                  </td>
                  <td className="px-3 py-3">
                    <MetricCell m={r.clicked} rate={r.rates.click} />
                  </td>
                  <td className="px-3 py-3">
                    <RealCell real={real.data?.get(r.channel)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        A dash means the platform doesn&apos;t report it. Hover it to see why.
        Rates are against delivered messages, or sent where a platform
        doesn&apos;t report delivery.
      </p>
    </section>
  );
}
