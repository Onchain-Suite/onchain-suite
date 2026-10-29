"use client";

import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";

import { campaignsService } from "../../campaigns.service";
import type { CampaignFunnel } from "../../contracts/funnel";
import { barWidth, pct } from "../../utils/funnel";

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  inapp: "In-app push",
  x: "X DM",
  telegram: "Telegram",
  discord: "Discord",
  farcaster: "Farcaster",
};

/** The four funnel stages, in order, each with its bar colour. */
const STAGES: {
  key: keyof Pick<CampaignFunnel, "reached" | "engaged" | "converted" | "lost">;
  label: string;
  sub: string;
  bar: string;
}[] = [
  {
    key: "reached",
    label: "Reached",
    sub: "messages that landed",
    bar: "bg-primary",
  },
  {
    key: "engaged",
    label: "Engaged",
    sub: "opened, viewed or read",
    bar: "bg-sky-500",
  },
  {
    key: "converted",
    label: "Converted",
    sub: "completed the goal on-chain",
    bar: "bg-emerald-500",
  },
  {
    key: "lost",
    label: "Lost",
    sub: "unsubscribed, blocked or muted",
    bar: "bg-red-500",
  },
];

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * The normalised conversion funnel on the campaign detail page (2.7):
 * Reached -> Engaged -> Converted -> Lost, folded across channels, with a
 * per-channel breakdown. Converted comes from the campaign's on-chain goal.
 */
export function ConversionFunnel({ campaignId }: { campaignId: string }) {
  const query = useQuery({
    queryKey: ["campaigns", "funnel", campaignId],
    enabled: Boolean(campaignId),
    queryFn: () => campaignsService.getCampaignFunnel(campaignId),
  });

  const funnel = query.data;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">
          Conversion funnel
        </h3>
        <p className="text-xs text-muted-foreground">
          One funnel for every channel.
        </p>
      </div>

      {query.isLoading ? (
        <div className="mt-4 space-y-3" aria-hidden="true">
          {STAGES.map((s) => (
            <div
              key={s.key}
              className="h-9 animate-pulse rounded-md bg-muted"
            />
          ))}
        </div>
      ) : query.isError || !funnel ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Funnel analytics aren&apos;t available for this campaign yet.
        </p>
      ) : (
        <FunnelBody funnel={funnel} />
      )}
    </section>
  );
}

function FunnelBody({ funnel }: { funnel: CampaignFunnel }) {
  const { reached, goal } = funnel;

  return (
    <div className="mt-4 space-y-5">
      <div className="space-y-3">
        {STAGES.map((stage, i) => {
          const value = funnel[stage.key];
          return (
            <div key={stage.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">
                  {stage.label}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {stage.sub}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-foreground">
                  {fmt(value)}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {i === 0 ? "100%" : `${pct(value, reached)} of reached`}
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", stage.bar)}
                  style={{ width: barWidth(value, reached) }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {goal ? (
        <p className="text-xs text-muted-foreground">
          Converted counts wallets that completed{" "}
          <span className="text-foreground">{goal.name}</span> on-chain within{" "}
          {goal.attributionWindowDays} days. Reads indexed on-chain events, so
          it only counts wallets on a contract you have indexed.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          No conversion goal set, so this campaign reports reach and engagement
          only.
        </p>
      )}

      {funnel.channels.length > 1 ? (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium text-foreground">By channel</p>
          <ul className="space-y-1.5">
            {funnel.channels.map((c) => (
              <li
                key={c.channel}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-foreground">
                  {CHANNEL_LABEL[c.channel] ?? c.channel}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {fmt(c.reached)} reached
                  {c.reached > 0 ? (
                    <span className="ml-2">
                      {pct(c.engaged, c.reached)} {c.engagedLabel.toLowerCase()}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
