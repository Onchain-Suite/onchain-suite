import type { CampaignStatus, CampaignType } from "../../campaigns/types";

export function getStatusColor(status: CampaignStatus): string {
  const colors: Record<CampaignStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-primary/10 text-primary",
    sending: "bg-secondary/10 text-secondary",
    sent: "bg-primary/10 text-primary",
    paused: "bg-muted text-muted-foreground",
    failed: "bg-destructive/10 text-destructive",
  };
  return colors[status];
}

export function getCampaignStatusColor(status: CampaignStatus): string {
  const colors: Record<CampaignStatus, string> = {
    draft: "text-muted-foreground",
    scheduled: "text-primary",
    sending: "text-secondary",
    sent: "text-primary",
    paused: "text-muted-foreground",
    failed: "text-destructive",
  };
  return colors[status];
}

export function getCampaignTypeColor(type: CampaignType): string {
  const colors: Record<CampaignType, string> = {
    newsletter: "bg-primary/10 text-primary",
    promotional: "bg-secondary/10 text-secondary",
    announcement: "bg-primary/10 text-primary",
    automation: "bg-secondary/10 text-secondary",
    "email-blast": "bg-primary/10 text-primary",
    "smart-sending": "bg-primary/10 text-primary",
  };
  return colors[type];
}

export function formatPercentage(value?: number): string {
  if (value === undefined) return "-";
  return `${value.toFixed(1)}%`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
