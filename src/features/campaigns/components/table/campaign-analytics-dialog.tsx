"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";

import {
  type CampaignEmailFunnel,
  type CampaignInAppFunnel,
  campaignsService,
} from "../../campaigns.service";
import { formatPercentage } from "../../utils";

interface CampaignAnalyticsDialogProps {
  campaignId: string;
  campaignName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCount = (value?: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "-";

function StatGrid({
  stats,
}: {
  stats: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border bg-muted/30 px-3 py-2"
        >
          <div className="text-xs text-muted-foreground">{stat.label}</div>
          <div className="text-sm font-semibold text-foreground">
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailFunnelSection({ funnel }: { funnel: CampaignEmailFunnel }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">Email</div>
      <StatGrid
        stats={[
          { label: "Sent", value: formatCount(funnel.sent) },
          { label: "Delivered", value: formatCount(funnel.delivered) },
          { label: "Unique opens", value: formatCount(funnel.uniqueOpens) },
          { label: "Unique clicks", value: formatCount(funnel.uniqueClicks) },
          { label: "Total clicks", value: formatCount(funnel.totalClicks) },
          { label: "Bounces", value: formatCount(funnel.bounces) },
          { label: "Unsubscribes", value: formatCount(funnel.unsubscribes) },
          { label: "Complaints", value: formatCount(funnel.complaints) },
          { label: "Suppressed", value: formatCount(funnel.suppressed) },
        ]}
      />
      <StatGrid
        stats={[
          {
            label: "Delivery rate",
            value: formatPercentage(funnel.deliveryRate),
          },
          { label: "Open rate", value: formatPercentage(funnel.openRate) },
          { label: "Click rate", value: formatPercentage(funnel.clickRate) },
          {
            label: "Click-to-open",
            value: formatPercentage(funnel.clickToOpenRate),
          },
          { label: "Bounce rate", value: formatPercentage(funnel.bounceRate) },
          {
            label: "Unsubscribe rate",
            value: formatPercentage(funnel.unsubscribeRate),
          },
        ]}
      />
    </div>
  );
}

function InAppFunnelSection({ funnel }: { funnel: CampaignInAppFunnel }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">In-app push</div>
      <StatGrid
        stats={[
          { label: "Sent", value: formatCount(funnel.sent) },
          { label: "Delivered", value: formatCount(funnel.delivered) },
          { label: "Viewed", value: formatCount(funnel.viewed) },
          { label: "Clicked", value: formatCount(funnel.clicked) },
          { label: "Dismissed", value: formatCount(funnel.dismissed) },
        ]}
      />
      <StatGrid
        stats={[
          {
            label: "Delivery rate",
            value: formatPercentage(funnel.deliveryRate),
          },
          { label: "View rate", value: formatPercentage(funnel.viewRate) },
          { label: "Click rate", value: formatPercentage(funnel.clickRate) },
          {
            label: "Dismiss rate",
            value: formatPercentage(funnel.dismissRate),
          },
        ]}
      />
    </div>
  );
}

/**
 * Per-campaign engagement funnel (GET /campaigns/{id}/analytics): the email
 * funnel with rates, the in-app push funnel, and combined totals.
 */
export function CampaignAnalyticsDialog({
  campaignId,
  campaignName,
  open,
  onOpenChange,
}: CampaignAnalyticsDialogProps) {
  const analyticsQuery = useQuery({
    queryKey: ["campaigns", "analytics", campaignId],
    queryFn: () => campaignsService.getAnalytics(campaignId),
    enabled: open && campaignId.length > 0,
    retry: false,
  });

  const analytics = analyticsQuery.data;
  const messagesSent = analytics?.totals?.messagesSent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Analytics{campaignName ? ` - ${campaignName}` : ""}
          </DialogTitle>
        </DialogHeader>

        {analyticsQuery.isLoading ? (
          <div className="animate-pulse space-y-3" aria-hidden="true">
            <div className="h-16 rounded-xl bg-muted" />
            <div className="h-40 rounded-xl bg-muted" />
            <div className="h-28 rounded-xl bg-muted" />
          </div>
        ) : analyticsQuery.isError ? (
          <div className="space-y-3 py-6 text-center">
            <div className="text-sm text-muted-foreground">
              {analyticsQuery.error instanceof Error
                ? analyticsQuery.error.message
                : "Failed to load analytics."}
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => analyticsQuery.refetch()}
            >
              <ArrowPathIcon aria-hidden="true" className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="text-xs text-muted-foreground">
                Total messages sent (email + in-app)
              </div>
              <div className="text-xl font-semibold text-foreground">
                {formatCount(messagesSent)}
              </div>
            </div>
            {analytics?.email ? (
              <EmailFunnelSection funnel={analytics.email} />
            ) : null}
            {analytics?.inapp ? (
              <InAppFunnelSection funnel={analytics.inapp} />
            ) : null}
            {!analytics?.email && !analytics?.inapp ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No engagement data yet - stats appear once the campaign has been
                sent.
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
