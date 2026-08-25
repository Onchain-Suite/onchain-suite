"use client";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";

import { cn } from "@/lib/utils";

import type { Campaign } from "../../../campaigns/types";
import {
  getCampaignStatusColor,
  getCampaignTypeColor,
} from "../../../campaigns/utils/campaign";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

interface CampaignDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  campaigns: Campaign[];
  timezone: string;
}

export function CampaignDetailModal({
  open,
  onOpenChange,
  selectedDate,
  campaigns,
  timezone,
}: CampaignDetailModalProps) {
  const router = useRouter();

  // Same destinations as the list view's row actions: sent/sending campaigns
  // open the wizard's review step ("View details"), everything else opens the
  // editable first step ("Edit campaign").
  const openCampaign = (campaign: Campaign) => {
    const qs = new URLSearchParams();
    qs.set("campaign", campaign.id);
    qs.set(
      "step",
      campaign.status === "sent" || campaign.status === "sending" ? "3" : "1"
    );
    onOpenChange(false);
    router.push(`${PRIVATE_ROUTES.NEW_CAMPAIGN}?${qs.toString()}`);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatDateOnly = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Campaigns on {selectedDate ? formatDateOnly(selectedDate) : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              role="button"
              tabIndex={0}
              aria-label={`Open campaign ${campaign.name}`}
              onClick={() => openCampaign(campaign)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openCampaign(campaign);
                }
              }}
              className="border-border bg-card rounded-xl overflow-hidden cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {campaign.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {campaign.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-lg px-3 py-1",
                          getCampaignStatusColor(campaign.status)
                        )}
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        Type
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-lg",
                          getCampaignTypeColor(campaign.type)
                        )}
                      >
                        {campaign.type}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        Recipients
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {typeof campaign.recipients === "number"
                          ? campaign.recipients.toLocaleString()
                          : "-"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        Audience
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {campaign.audience.map((aud, i) => (
                          <Badge
                            // eslint-disable-next-line react/no-array-index-key
                            key={`${aud}-${i}`}
                            variant="secondary"
                            className="rounded-lg text-xs"
                          >
                            {aud}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        Created
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDateTime(campaign.createdAt)}
                      </p>
                    </div>

                    {campaign.scheduledFor && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">
                          Scheduled For
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formatDateTime(campaign.scheduledFor)}
                        </p>
                      </div>
                    )}

                    {campaign.sentAt && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">
                          Sent At
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formatDateTime(campaign.sentAt)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Performance Metrics - prefer the honest of-delivered rate
                      and always state its denominator. Rates are already
                      percentages; never x100, never clamp. */}
                  {(() => {
                    const openR =
                      campaign.openRateOfDelivered ??
                      campaign.openRateOfAudience ??
                      campaign.openRate;
                    const clickR =
                      campaign.clickRateOfDelivered ??
                      campaign.clickRateOfAudience ??
                      campaign.clickRate;
                    if (openR === undefined && clickR === undefined)
                      return null;
                    const ofDelivered =
                      campaign.openRateOfDelivered !== undefined ||
                      campaign.clickRateOfDelivered !== undefined;
                    const denomN = ofDelivered
                      ? campaign.delivered
                      : campaign.recipients;
                    const denom =
                      typeof denomN === "number"
                        ? `of ${denomN.toLocaleString()} ${ofDelivered ? "delivered" : "sent"}`
                        : null;
                    return (
                      <div className="pt-4 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-3">
                          Performance
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          {openR !== undefined && (
                            <div className="space-y-1">
                              <p className="text-2xl font-bold text-foreground">
                                {openR.toFixed(1)}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Open Rate{denom ? ` ${denom}` : ""}
                              </p>
                            </div>
                          )}
                          {clickR !== undefined && (
                            <div className="space-y-1">
                              <p className="text-2xl font-bold text-foreground">
                                {clickR.toFixed(1)}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Click Rate{denom ? ` ${denom}` : ""}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
