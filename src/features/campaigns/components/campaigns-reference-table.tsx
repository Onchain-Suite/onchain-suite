"use client";

import {
  DevicePhoneMobileIcon,
  EllipsisVerticalIcon,
  EnvelopeIcon,
  NoSymbolIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

import { cn } from "@/lib/utils";

import { campaignsService } from "../campaigns.service";
import type { Campaign, CampaignStatus } from "../types/campaign";

const STATUS_META: Record<
  CampaignStatus,
  { label: string; dot: string; text: string; bg: string }
> = {
  sent: {
    label: "Sent",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  scheduled: {
    label: "Scheduled",
    dot: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  sending: {
    label: "Sending",
    dot: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  paused: {
    label: "Paused",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  draft: {
    label: "Draft",
    dot: "bg-muted-foreground/60",
    text: "text-muted-foreground",
    bg: "bg-muted",
  },
  failed: {
    label: "Failed",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
  },
};

/** Statuses whose send can still be stopped via POST /campaigns/{id}/cancel. */
const CANCELLABLE_STATUSES = new Set<CampaignStatus>(["scheduled", "sending"]);

/**
 * Statuses that have actually fanned out messages, so per-campaign engagement
 * rates exist. `paused` is included because a paused send may already have
 * delivered a batch; drafts/scheduled never have sends so we never fetch them.
 */
const HAS_SENDS_STATUSES = new Set<CampaignStatus>(["sent", "paused"]);

const isPushChannel = (channel: string) =>
  channel === "inapp" || channel === "in-app-push" || channel === "push";

/** Which channel glyphs to show - defaults to email when the API sends none. */
const channelsFor = (campaign: Campaign) => {
  const used =
    campaign.channelsUsed && campaign.channelsUsed.length > 0
      ? campaign.channelsUsed
      : ["email"];
  return {
    email: used.some((c) => c === "email"),
    push: used.some(isPushChannel),
  };
};

const formatCount = (value?: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "-";

const formatWhen = (campaign: Campaign) => {
  const when = campaign.sentAt ?? campaign.scheduledFor ?? campaign.createdAt;
  if (!(when instanceof Date) || Number.isNaN(when.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(when);
};

function ChannelIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground"
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

const isFiniteRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Rate as a percent with up to 1 dp (never x100, never clamped). */
const formatRate = (value: number) => {
  const r = Math.round(value * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)}%`;
};
/** "of N delivered / sent" denominator label, or undefined when unknown. */
const denomLabel = (n: number | undefined, kind: string) =>
  typeof n === "number" && Number.isFinite(n)
    ? `of ${n.toLocaleString()} ${kind}`
    : undefined;

/**
 * Right-aligned rate cell. `title` states the denominator (the rate is
 * meaningless without it). Rates are already percentages - not clamped, so a
 * click rate above 100% (multi-click + scanner prefetch) shows honestly.
 */
function RateValueCell({
  value,
  title,
}: {
  value: number | undefined;
  title?: string;
}) {
  return (
    <td
      className="px-4 py-4 text-right tabular-nums text-foreground"
      title={title}
    >
      {isFiniteRate(value) ? (
        formatRate(value)
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </td>
  );
}

/** Static muted dash for campaigns that never sent - no fetch, no fabrication. */
function RateDashCell() {
  return (
    <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
      -
    </td>
  );
}

/** Thin pulse while a sent row's analytics loads. */
function RateLoadingCell() {
  return (
    <td className="px-4 py-4 text-right">
      <span
        className="ml-auto inline-block h-3 w-8 animate-pulse rounded bg-muted align-middle"
        aria-hidden="true"
      />
    </td>
  );
}

/**
 * The Open/view-rate + Click-rate pair for one row. The honest rate mid-send is
 * over what actually delivered, so we prefer the list row's `*OfDelivered`
 * fields (present on every `GET /campaigns` row - no fetch), fall back to the
 * of-audience fields, and only then fetch the per-campaign funnel (needed for
 * in-app view rate and legacy rows). The denominator rides along as a tooltip;
 * the Recipients column also shows `N delivered`.
 */
function RateCells({ campaign }: { campaign: Campaign }) {
  const isSent = HAS_SENDS_STATUSES.has(campaign.status);
  const usedEmail = channelsFor(campaign).email;

  const openDelivered = campaign.openRateOfDelivered;
  const clickDelivered = campaign.clickRateOfDelivered;
  const openAudience = campaign.openRateOfAudience ?? campaign.openRate;
  const clickAudience = campaign.clickRateOfAudience ?? campaign.clickRate;
  const hasListRates =
    isFiniteRate(openDelivered) ||
    isFiniteRate(clickDelivered) ||
    isFiniteRate(openAudience) ||
    isFiniteRate(clickAudience);

  const analyticsQuery = useQuery({
    queryKey: ["campaigns", campaign.id, "analytics"],
    queryFn: () => campaignsService.getAnalytics(campaign.id),
    // Only fetch when the row didn't already carry rates (in-app / legacy rows).
    enabled: isSent && !hasListRates,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // draft / scheduled: never sent, so show a plain dash and skip the fetch.
  if (!isSent) {
    return (
      <>
        <RateDashCell />
        <RateDashCell />
      </>
    );
  }

  if (!hasListRates && analyticsQuery.isLoading) {
    return (
      <>
        <RateLoadingCell />
        <RateLoadingCell />
      </>
    );
  }

  const analytics = analyticsQuery.data;
  const funnel = usedEmail ? analytics?.email : analytics?.inapp;
  const funnelBase = funnel?.delivered ?? funnel?.sent;
  const funnelKind = funnel?.delivered !== undefined ? "delivered" : "sent";

  // of-delivered (honest) -> of-audience -> per-campaign funnel.
  const resolve = (
    ofDelivered: number | undefined,
    ofAudience: number | undefined,
    funnelRate: number | undefined
  ): { value: number | undefined; title: string | undefined } => {
    if (isFiniteRate(ofDelivered)) {
      return {
        value: ofDelivered,
        title: denomLabel(campaign.delivered, "delivered"),
      };
    }
    if (isFiniteRate(ofAudience)) {
      return {
        value: ofAudience,
        title: denomLabel(campaign.recipients, "sent"),
      };
    }
    return { value: funnelRate, title: denomLabel(funnelBase, funnelKind) };
  };

  const open = resolve(
    openDelivered,
    openAudience,
    usedEmail ? analytics?.email?.openRate : analytics?.inapp?.viewRate
  );
  const click = resolve(
    clickDelivered,
    clickAudience,
    usedEmail ? analytics?.email?.clickRate : analytics?.inapp?.clickRate
  );

  return (
    <>
      <RateValueCell value={open.value} title={open.title} />
      <RateValueCell value={click.value} title={click.title} />
    </>
  );
}

/**
 * Campaigns list table: name + channel glyphs, status pill, recipient count,
 * open/view + click rates, and the send/schedule time, with the whole row
 * navigating to the campaign. Open/click rates aren't on the list response, so
 * each sent row fetches its own funnel (GET /campaigns/{id}/analytics) via a
 * per-campaign React Query - see RateCells. Campaign counts stay small
 * (the list is capped at 200 server-side), so a plain table is fine here - no
 * virtualization needed.
 */
export function CampaignsReferenceTable({
  data,
  onSelect,
  onDelete,
  onCancel,
}: {
  data: Campaign[];
  /** Row click - opens the campaign detail drawer. */
  onSelect: (campaign: Campaign) => void;
  /** Row menu - asks the list to confirm + delete the campaign. */
  onDelete: (campaign: Campaign) => void;
  /** Row menu - asks the list to confirm + cancel an in-flight/scheduled send. */
  onCancel: (campaign: Campaign) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
            <th className="py-3 pr-4 font-medium">Campaign</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Recipients</th>
            <th className="px-4 py-3 text-right font-medium">
              Open / view rate
            </th>
            <th className="px-4 py-3 text-right font-medium">Click rate</th>
            <th className="px-4 py-3 font-medium">Sent / Scheduled</th>
            <th className="w-8 py-3" aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {data.map((campaign) => {
            const status = STATUS_META[campaign.status] ?? STATUS_META.draft;
            const channels = channelsFor(campaign);
            // A send is enqueued (status "sent") before it's fully delivered, so
            // show "N delivered" while delivered trails the audience - the row
            // reads as in-flight instead of finished at a misleading rate.
            const started = ["sending", "sent", "paused", "failed"].includes(
              campaign.status
            );
            const showDelivered =
              started &&
              typeof campaign.delivered === "number" &&
              (typeof campaign.recipients !== "number" ||
                campaign.delivered < campaign.recipients);
            return (
              <tr
                key={campaign.id}
                onClick={() => onSelect(campaign)}
                className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/40"
              >
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {campaign.name}
                    </span>
                    <span className="flex items-center gap-1">
                      {channels.email ? (
                        <ChannelIcon>
                          <EnvelopeIcon className="size-3.5" />
                        </ChannelIcon>
                      ) : null}
                      {channels.push ? (
                        <ChannelIcon>
                          <DevicePhoneMobileIcon className="size-3.5" />
                        </ChannelIcon>
                      ) : null}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
                      status.bg,
                      status.text
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", status.dot)} />
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-4 text-right tabular-nums text-foreground">
                  <div>{formatCount(campaign.recipients)}</div>
                  {showDelivered ? (
                    <div className="text-[11px] font-normal text-muted-foreground">
                      {campaign.delivered?.toLocaleString()} delivered
                    </div>
                  ) : null}
                </td>
                <RateCells campaign={campaign} />
                <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                  {formatWhen(campaign)}
                </td>
                <td
                  className="py-4 pl-2 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Actions for ${campaign.name}`}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <EllipsisVerticalIcon
                          className="size-4"
                          aria-hidden="true"
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {CANCELLABLE_STATUSES.has(campaign.status) ? (
                        <DropdownMenuItem onClick={() => onCancel(campaign)}>
                          <NoSymbolIcon className="size-4" aria-hidden="true" />
                          Cancel send
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(campaign)}
                      >
                        <TrashIcon className="size-4" aria-hidden="true" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
