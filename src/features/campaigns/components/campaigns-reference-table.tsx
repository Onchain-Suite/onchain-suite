"use client";

import {
  DevicePhoneMobileIcon,
  EllipsisVerticalIcon,
  EnvelopeIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

import { cn } from "@/lib/utils";

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

const formatRate = (value?: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}%`
    : "-";

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

/**
 * Campaigns list table, matched to the reference exactly: name + channel
 * glyphs, status pill, recipient/open/click stats, and the send/schedule time,
 * with the whole row navigating to the campaign. Campaign counts stay small
 * (the list is capped at 200 server-side), so a plain table is fine here - no
 * virtualization needed.
 */
export function CampaignsReferenceTable({
  data,
  onSelect,
  onDelete,
}: {
  data: Campaign[];
  /** Row click - opens the campaign detail drawer. */
  onSelect: (campaign: Campaign) => void;
  /** Row menu - asks the list to confirm + delete the campaign. */
  onDelete: (campaign: Campaign) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
            <th className="py-3 pr-4 font-medium">Campaign</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Recipients</th>
            <th className="px-4 py-3 text-right font-medium">Open rate</th>
            <th className="px-4 py-3 text-right font-medium">Click rate</th>
            <th className="px-4 py-3 font-medium">Sent / Scheduled</th>
            <th className="w-8 py-3" aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {data.map((campaign) => {
            const status = STATUS_META[campaign.status] ?? STATUS_META.draft;
            const channels = channelsFor(campaign);
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
                  {formatCount(campaign.recipients)}
                </td>
                <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
                  {formatRate(campaign.openRate)}
                </td>
                <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
                  {formatRate(campaign.clickRate)}
                </td>
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
