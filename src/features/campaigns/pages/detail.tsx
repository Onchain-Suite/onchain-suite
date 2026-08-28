"use client";

import {
  ArrowLeftIcon,
  DevicePhoneMobileIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { ArrowTrendingUpIcon } from "@heroicons/react/24/solid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { type CampaignAnalytics, campaignsService } from "../campaigns.service";
import type { Campaign, CampaignStatus } from "../types/campaign";
import {
  campaignRates,
  campaignUsesEmail,
  SENT_STATUSES,
} from "../utils/rates";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const TYPE_LABEL: Record<string, string> = {
  "email-blast": "Email blast",
  newsletter: "Newsletter",
  "smart-sending": "Smart campaign",
  automation: "Automation",
};

const STATUS_META: Record<
  string,
  { label: string; dot: string; text: string; bg: string }
> = {
  sent: {
    label: "Sent",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  sending: {
    label: "Sending",
    dot: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  scheduled: {
    label: "Scheduled",
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

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const fmtCount = (v?: number) => (isNum(v) ? v.toLocaleString() : "-");
const fmtPct = (v?: number) => (isNum(v) ? `${v.toFixed(1)}%` : "-");

const fmtWhen = (d?: Date | string) => {
  const date = d instanceof Date ? d : d ? new Date(d) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date)
    : "-";
};

const relTime = (d?: Date | string) => {
  const date = d instanceof Date ? d : d ? new Date(d) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const secs = Math.round((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
};

/** A campaign's channel mix, normalized so rows with the SAME mix are
 *  comparable (email-only vs push-heavy funnels aren't). */
const channelMixKey = (c?: Campaign | null) => {
  const chans = (c?.channelsUsed ?? []).filter(Boolean);
  if (chans.length === 0) return "email";
  return [...new Set(chans)].sort().join("+");
};

const shorten = (v: string) =>
  /^0x[a-fA-F0-9]{10,}$/.test(v) ? `${v.slice(0, 6)}…${v.slice(-4)}` : v;

/** Rates read straight off a `GET /campaigns` list row (already percentages). */
const rowRates = (c: Campaign) => ({
  open: c.openRateOfDelivered ?? c.openRateOfAudience ?? c.openRate,
  click: c.clickRateOfDelivered ?? c.clickRateOfAudience ?? c.clickRate,
});

// Recent activity is hidden until the per-recipient GET /campaigns/{id}/activity
// endpoint ships (see campaignsService.getActivity). The component + query stay
// wired - flip this to true to bring the section back.
const SHOW_RECENT_ACTIVITY: boolean = false;

export function CampaignDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const campaignQuery = useQuery({
    queryKey: ["campaigns", "detail", id],
    queryFn: () => campaignsService.getCampaign(id),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const listQuery = useQuery({
    queryKey: ["campaigns", "list"],
    queryFn: () => campaignsService.listCampaigns({ page: 1, limit: 200 }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // The single-campaign endpoint can omit the audience/timestamp/rate fields
  // that the list rows carry, so recipients + sent time render as "-". Fill
  // them from this campaign's list row when the detail response is missing them.
  const listRow = useMemo(
    () => (listQuery.data ?? []).find((c) => c.id === id),
    [listQuery.data, id]
  );
  const campaign: Campaign | undefined = useMemo(() => {
    const base = campaignQuery.data;
    if (!base) return listRow;
    if (!listRow) return base;
    return {
      ...base,
      recipients: base.recipients ?? listRow.recipients,
      delivered: base.delivered ?? listRow.delivered,
      sentAt: base.sentAt ?? listRow.sentAt,
      scheduledFor: base.scheduledFor ?? listRow.scheduledFor,
      channelsUsed: base.channelsUsed ?? listRow.channelsUsed,
      openRateOfDelivered:
        base.openRateOfDelivered ?? listRow.openRateOfDelivered,
      clickRateOfDelivered:
        base.clickRateOfDelivered ?? listRow.clickRateOfDelivered,
      openRateOfAudience: base.openRateOfAudience ?? listRow.openRateOfAudience,
      clickRateOfAudience:
        base.clickRateOfAudience ?? listRow.clickRateOfAudience,
      openRate: base.openRate ?? listRow.openRate,
      clickRate: base.clickRate ?? listRow.clickRate,
      opens: base.opens ?? listRow.opens,
      clicks: base.clicks ?? listRow.clicks,
    };
  }, [campaignQuery.data, listRow]);

  const status = (campaign?.status ?? "draft") as CampaignStatus;
  const isSent =
    status === "sent" || status === "sending" || status === "paused";

  const analyticsQuery = useQuery({
    queryKey: ["campaigns", "analytics", id],
    queryFn: () => campaignsService.getAnalytics(id),
    enabled: Boolean(campaign) && isSent,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const analytics = analyticsQuery.data;

  // Per-recipient engagement feed for this campaign (see getActivity). Returns
  // [] until the backend endpoint ships, so the section shows an empty state
  // rather than the campaign lifecycle events.
  const activityQuery = useQuery({
    queryKey: ["campaigns", "detail", id, "activity"],
    queryFn: () => campaignsService.getActivity(id),
    enabled: SHOW_RECENT_ACTIVITY && Boolean(campaign) && isSent,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const duplicateMutation = useMutation({
    mutationFn: () => campaignsService.duplicateCampaign(id),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", "list"] });
      if (created?.id) {
        router.push(`${PRIVATE_ROUTES.NEW_CAMPAIGN}?campaign=${created.id}`);
      }
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to duplicate"),
  });

  // This campaign's headline rates - prefer the precise per-channel analytics,
  // fall back to the list row.
  const rates = useMemo(() => {
    if (!campaign) return { open: undefined, click: undefined };
    const fromAnalytics = campaignRates(campaign, analytics);
    const fromRow = rowRates(campaign);
    return {
      open: fromAnalytics.open ?? fromRow.open,
      click: fromAnalytics.click ?? fromRow.click,
    };
  }, [campaign, analytics]);

  // The most recent OTHER sent campaign with the SAME channel mix - the basis
  // for the "+6.4pt" deltas (comparing unlike mixes would be misleading).
  const prevSameMix = useMemo(() => {
    if (!campaign) return null;
    const mix = channelMixKey(campaign);
    return (listQuery.data ?? [])
      .filter(
        (c) =>
          c.id !== campaign.id &&
          SENT_STATUSES.has(c.status) &&
          channelMixKey(c) === mix
      )
      .sort(
        (a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0)
      )[0];
  }, [campaign, listQuery.data]);

  const delta = (mine?: number, base?: number) =>
    isNum(mine) && isNum(base) ? mine - base : undefined;

  const openDelta = delta(
    rates.open,
    prevSameMix ? rowRates(prevSameMix).open : undefined
  );
  const clickDelta = delta(
    rates.click,
    prevSameMix ? rowRates(prevSameMix).click : undefined
  );

  // Only surface the channels this campaign actually uses - never an in-app row
  // on an email-only send, or vice versa.
  const channels = useMemo(() => {
    const chans = campaign?.channelsUsed ?? [];
    if (chans.length > 0) {
      return {
        email: chans.includes("email"),
        inapp: chans.some((c) => c !== "email"),
      };
    }
    const usesEmail = campaign ? campaignUsesEmail(campaign) : true;
    return { email: usesEmail, inapp: !usesEmail };
  }, [campaign]);

  if (campaignQuery.isLoading && !campaign) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6" aria-hidden="true">
        <div className="h-8 w-64 animate-pulse rounded bg-card/60" />
        <div className="h-28 animate-pulse rounded-2xl border border-border bg-card/60" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-card/60" />
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-card/60" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load this campaign.
        </p>
        <Button asChild variant="outline">
          <Link href={PRIVATE_ROUTES.CAMPAIGNS}>Back to campaigns</Link>
        </Button>
      </div>
    );
  }

  const meta = STATUS_META[status] ?? STATUS_META.draft;
  const isPush =
    (campaign.channelsUsed ?? []).some((c) => c !== "email") &&
    !(campaign.channelsUsed ?? []).includes("email");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link
            href={PRIVATE_ROUTES.CAMPAIGNS}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            Campaigns
          </Link>
          <h1 className="truncate text-lg font-semibold text-foreground">
            {campaign.name}
          </h1>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
              meta.bg,
              meta.text
            )}
          >
            <span className={cn("size-1.5 rounded-full", meta.dot)} />
            {meta.label}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            {isPush ? (
              <DevicePhoneMobileIcon className="size-4" aria-hidden="true" />
            ) : (
              <EnvelopeIcon className="size-4" aria-hidden="true" />
            )}
            {TYPE_LABEL[campaign.type] ?? "Email"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isSent ? (
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={duplicateMutation.isPending}
              onClick={() => duplicateMutation.mutate()}
            >
              <DocumentDuplicateIcon
                className="mr-1.5 size-4"
                aria-hidden="true"
              />
              Duplicate
            </Button>
          ) : null}
          {/* Editing stays available after send - the editor has no lock and
              autosave persists changes without re-sending (launch is a separate
              explicit action). */}
          <Button
            className="rounded-xl"
            onClick={() =>
              router.push(`${PRIVATE_ROUTES.NEW_CAMPAIGN}?campaign=${id}`)
            }
          >
            <PencilSquareIcon className="mr-1.5 size-4" aria-hidden="true" />
            Edit campaign
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border lg:grid-cols-4">
        <Stat label="Recipients" value={fmtCount(campaign.recipients)} />
        <Stat
          label="Open / view rate"
          value={fmtPct(rates.open)}
          delta={openDelta}
        />
        <Stat
          label="Click rate"
          value={fmtPct(rates.click)}
          delta={clickDelta}
        />
        <Stat
          label={status === "scheduled" ? "Scheduled" : "Sent"}
          value={fmtWhen(
            status === "scheduled" ? campaign.scheduledFor : campaign.sentAt
          )}
        />
      </div>

      {!isSent ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          This campaign hasn&apos;t sent yet - engagement analytics appear here
          once it goes out.
        </div>
      ) : (
        <>
          <div
            className={cn(
              "grid gap-6",
              SHOW_RECENT_ACTIVITY && "lg:grid-cols-[1.6fr_1fr]"
            )}
          >
            <PerformanceByChannel
              analytics={analytics}
              channels={channels}
              loading={analyticsQuery.isLoading}
              error={analyticsQuery.isError}
              onRetry={() => analyticsQuery.refetch()}
            />
            {SHOW_RECENT_ACTIVITY ? (
              <RecentActivity
                events={activityQuery.data}
                loading={activityQuery.isLoading}
                error={activityQuery.isError}
              />
            ) : null}
          </div>

          <ComparedWithPrevious
            current={campaign}
            currentRates={rates}
            all={listQuery.data ?? []}
          />
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: number;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {typeof delta === "number" && Number.isFinite(delta) ? (
        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-xs font-medium",
            delta >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          )}
        >
          <ArrowTrendingUpIcon
            className={cn("size-3.5", delta < 0 && "rotate-180")}
            aria-hidden="true"
          />
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}pt
        </p>
      ) : null}
    </div>
  );
}

function PerformanceByChannel({
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
      engagedRate: email?.openRate,
      clickRate: email?.clickRate,
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

const EVENT_TONE: Record<string, string> = {
  opened: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  open: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  viewed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  clicked: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  click: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  unsubscribed: "bg-muted text-muted-foreground",
  unsubscribe: "bg-muted text-muted-foreground",
  bounced: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  bounce: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400",
};

type ActivityRow = {
  id: string;
  who: string | null;
  type: string;
  channel: string;
  when?: string;
};

/** Normalize a raw campaign event into a display row, best-effort across the
 *  fields the backend may use. */
function normalizeEvent(raw: unknown, index: number): ActivityRow | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const contact =
    e.contact && typeof e.contact === "object"
      ? (e.contact as Record<string, unknown>)
      : undefined;
  const who =
    str(contact?.ens) ??
    str(contact?.walletAddress) ??
    str(contact?.email) ??
    str(e.ens) ??
    str(e.walletAddress) ??
    str(e.wallet) ??
    str(e.email) ??
    str(e.recipient) ??
    null;
  const type = (str(e.type) ?? str(e.event) ?? str(e.status) ?? "event")
    .toLowerCase()
    .replace(/^email\./, "");
  const channel =
    str(e.channel) ?? (str(e.type)?.startsWith("inapp") ? "In-app" : "Email");
  const when =
    str(e.createdAt) ?? str(e.at) ?? str(e.timestamp) ?? str(e.occurredAt);
  const id = str(e.id) ?? `${type}-${index}`;
  return { id, who: who ? shorten(who) : null, type, channel, when };
}

function RecentActivity({
  events,
  loading,
  error,
}: {
  events: unknown;
  loading: boolean;
  error: boolean;
}) {
  const rows = useMemo(() => {
    const list = Array.isArray(events) ? events : [];
    return list
      .map(normalizeEvent)
      .filter((x): x is ActivityRow => x !== null)
      .reverse() // backend returns oldest-first; show newest first
      .slice(0, 12);
  }, [events]);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">
        Recent activity
      </h2>
      <div className="mt-4">
        {loading ? (
          <div className="space-y-2">
            {["a", "b", "c", "d"].map((k) => (
              <div key={k} className="h-8 animate-pulse rounded bg-muted/40" />
            ))}
          </div>
        ) : error || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent activity to show yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-1.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-mono text-xs text-foreground">
                    {r.who ?? "—"}
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-xs font-medium capitalize",
                      EVENT_TONE[r.type] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {r.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.channel}
                  </span>
                </span>
                {r.when ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {relTime(r.when)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ComparedWithPrevious({
  current,
  currentRates,
  all,
}: {
  current: Campaign;
  currentRates: { open?: number; click?: number };
  all: Campaign[];
}) {
  const mix = channelMixKey(current);
  const rows = useMemo(() => {
    const others = all
      .filter((c) => c.id !== current.id && SENT_STATUSES.has(c.status))
      .sort((a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0))
      .slice(0, 4);
    return [current, ...others];
  }, [all, current]);

  const channelIcons = (c: Campaign) => {
    const chans = c.channelsUsed ?? [];
    const hasEmail = chans.length === 0 || chans.includes("email");
    const hasPush = chans.some((x) => x !== "email");
    return { hasEmail, hasPush };
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          Compared with previous campaigns
        </h2>
        <span className="text-xs text-muted-foreground">
          Deltas are this campaign against that row
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Campaign</th>
              <th className="px-4 py-2 font-medium">Recipients</th>
              <th className="px-4 py-2 font-medium">Open / view rate</th>
              <th className="px-4 py-2 font-medium">Click rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const isCurrent = c.id === current.id;
              const r = isCurrent ? currentRates : rowRates(c);
              const sameMix = channelMixKey(c) === mix;
              const { hasEmail, hasPush } = channelIcons(c);
              const openD =
                !isCurrent &&
                sameMix &&
                isNum(currentRates.open) &&
                isNum(r.open)
                  ? currentRates.open - r.open
                  : undefined;
              const clickD =
                !isCurrent &&
                sameMix &&
                isNum(currentRates.click) &&
                isNum(r.click)
                  ? currentRates.click - r.click
                  : undefined;
              return (
                <tr
                  key={c.id}
                  className={cn(
                    "border-b border-border last:border-0",
                    isCurrent && "bg-primary/[0.04]"
                  )}
                >
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2">
                      {isCurrent ? null : (
                        <Link
                          href={`${PRIVATE_ROUTES.CAMPAIGNS}/${c.id}`}
                          className="truncate font-medium text-foreground hover:text-primary"
                        >
                          {c.name}
                        </Link>
                      )}
                      {isCurrent ? (
                        <>
                          <span className="truncate font-medium text-foreground">
                            {c.name}
                          </span>
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            This one
                          </span>
                        </>
                      ) : null}
                      <span className="flex items-center gap-1 text-muted-foreground">
                        {hasEmail ? (
                          <EnvelopeIcon
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        ) : null}
                        {hasPush ? (
                          <DevicePhoneMobileIcon
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        ) : null}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {fmtCount(c.recipients)}
                  </td>
                  <td className="px-4 py-3">
                    <RateCell
                      rate={r.open}
                      delta={openD}
                      sameMix={sameMix}
                      isCurrent={isCurrent}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <RateCell
                      rate={r.click}
                      delta={clickD}
                      sameMix={sameMix}
                      isCurrent={isCurrent}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Deltas are only drawn against campaigns with the same channel mix.
        In-app push is viewed about twice as often as email is opened, so a
        push-heavy send outscores an email-only one whatever the message said -
        rows on a different mix are listed for context but not differenced.
      </p>
    </section>
  );
}

function RateCell({
  rate,
  delta,
  sameMix,
  isCurrent,
}: {
  rate?: number;
  delta?: number;
  sameMix: boolean;
  isCurrent: boolean;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className="font-medium text-foreground">{fmtPct(rate)}</span>
      {isCurrent ? null : !sameMix ? (
        <span className="text-xs italic text-muted-foreground">
          different mix
        </span>
      ) : typeof delta === "number" && Number.isFinite(delta) ? (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-medium",
            delta >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          )}
        >
          <ArrowTrendingUpIcon
            className={cn("size-3", delta < 0 && "rotate-180")}
            aria-hidden="true"
          />
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}pt
        </span>
      ) : null}
    </span>
  );
}

export default CampaignDetailPage;
