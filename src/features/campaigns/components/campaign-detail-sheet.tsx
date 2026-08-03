"use client";

import {
  ClockIcon,
  DevicePhoneMobileIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { cn } from "@/lib/utils";

import { campaignsService } from "../campaigns.service";
import type { Campaign, CampaignStatus } from "../types/campaign";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const TYPE_LABEL: Record<string, string> = {
  "email-blast": "Email blast",
  newsletter: "Newsletter",
  "smart-sending": "Smart campaign",
  automation: "Automation",
};

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

const formatWhen = (d?: Date) =>
  d instanceof Date && !Number.isNaN(d.getTime())
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(d)
    : "—";

const pct = (v?: number) =>
  typeof v === "number" && Number.isFinite(v) ? `${Math.round(v)}%` : "—";
const count = (v?: number) =>
  typeof v === "number" && Number.isFinite(v) ? v.toLocaleString() : undefined;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function CampaignDetailSheet({
  campaign,
  onOpenChange,
}: {
  campaign: Campaign | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const open = Boolean(campaign);
  const id = campaign?.id ?? "";
  const status = campaign?.status ?? "draft";
  const isSent = status === "sent" || status === "sending";
  const isScheduled = status === "scheduled";

  const analyticsQuery = useQuery({
    queryKey: ["campaigns", "analytics", id],
    queryFn: () => campaignsService.getAnalytics(id),
    enabled: open && isSent,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const funnel = analyticsQuery.data?.email;

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

  const meta = STATUS_META[status] ?? STATUS_META.draft;
  const isPush =
    (campaign?.channelsUsed ?? []).some((c) => c !== "email") &&
    !(campaign?.channelsUsed ?? []).includes("email");
  const openWizard = (step?: number) =>
    router.push(
      `${PRIVATE_ROUTES.NEW_CAMPAIGN}?campaign=${id}${step ? `&step=${step}` : ""}`
    );

  const openRate = pct(funnel?.openRate);
  const clickRate = pct(funnel?.clickRate);
  const opens = count(funnel?.uniqueOpens);
  const clicks = count(funnel?.uniqueClicks);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="truncate pr-6 text-lg">
            {campaign?.name ?? "Campaign"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-2 flex items-center gap-2">
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
              {TYPE_LABEL[campaign?.type ?? ""] ?? "Email"}
            </span>
          </div>

          <div className="mt-2">
            <Row
              label="Recipients"
              value={
                typeof campaign?.recipients === "number"
                  ? campaign.recipients.toLocaleString()
                  : "—"
              }
            />
            <Row
              label={isScheduled ? "Scheduled for" : "Sent"}
              value={formatWhen(
                isScheduled ? campaign?.scheduledFor : campaign?.sentAt
              )}
            />
            <Row
              label="Open rate"
              value={
                isSent ? (
                  <>
                    {openRate}
                    {opens ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        ({opens})
                      </span>
                    ) : null}
                  </>
                ) : (
                  "—"
                )
              }
            />
            <Row
              label="Click rate"
              value={
                isSent ? (
                  <>
                    {clickRate}
                    {clicks ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        ({clicks})
                      </span>
                    ) : null}
                  </>
                ) : (
                  "—"
                )
              }
            />
          </div>

          {isScheduled ? (
            <div className="mt-4 flex gap-2 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-600 dark:text-blue-400">
              <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
              <p>
                This campaign hasn&apos;t sent yet. Editing pauses the schedule
                until you re-confirm on the review step.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          {isScheduled ? (
            <>
              <Button
                variant="outline"
                className="rounded-lg"
                onClick={() => openWizard(3)}
              >
                Reschedule
              </Button>
              <Button className="rounded-lg" onClick={() => openWizard()}>
                <PencilSquareIcon
                  className="mr-1.5 size-4"
                  aria-hidden="true"
                />
                Edit campaign
              </Button>
            </>
          ) : isSent ? (
            <Button
              variant="outline"
              className="rounded-lg"
              disabled={duplicateMutation.isPending}
              onClick={() => duplicateMutation.mutate()}
            >
              <DocumentDuplicateIcon
                className="mr-1.5 size-4"
                aria-hidden="true"
              />
              Duplicate
            </Button>
          ) : (
            <Button className="rounded-lg" onClick={() => openWizard()}>
              <PencilSquareIcon className="mr-1.5 size-4" aria-hidden="true" />
              Edit campaign
            </Button>
          )}
          <SheetClose asChild>
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
