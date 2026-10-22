"use client";

import { useQuery } from "@tanstack/react-query";

import { CopyButton } from "@/components/common/copy-button";
import { Skeleton } from "@/components/ui/skeleton";

import { connectionsService } from "@/features/integrations/connections.service";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";

/**
 * The callback URL and verify token to paste into Meta, so replies and
 * opt-ins reach us. Read on demand; the token is per workspace.
 */
export function WhatsAppWebhook() {
  const { organizationId } = useAccountOrg();
  const query = useQuery({
    queryKey: [
      "organization",
      "connections",
      "whatsapp",
      "webhook",
      organizationId,
    ],
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: () =>
      connectionsService.whatsappWebhookSetup(organizationId ?? undefined),
  });

  if (query.isLoading) return <Skeleton className="h-20 w-full rounded-lg" />;
  if (query.error) {
    return <p className="text-xs text-destructive">{query.error.message}</p>;
  }
  if (!query.data) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        In Meta, under WhatsApp → Configuration → Webhook, paste these and
        subscribe to <code className="text-xs">messages</code>.
      </p>
      <Row label="Callback URL" value={query.data.webhookUrl} />
      <Row label="Verify token" value={query.data.verifyToken} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1.5">
        <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs text-foreground">
          {value}
        </code>
        <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
      </div>
    </div>
  );
}
