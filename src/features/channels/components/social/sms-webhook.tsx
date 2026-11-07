"use client";

import { useQuery } from "@tanstack/react-query";

import { CopyButton } from "@/components/common/copy-button";
import { Skeleton } from "@/components/ui/skeleton";

import { connectionsService } from "@/features/integrations/connections.service";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";

/**
 * The inbound webhook URL to paste into Twilio, so opt-in replies and STOP
 * reach us. No verify token: the provider authenticates each request with a
 * signature over this exact URL. Read on demand; the URL is per workspace.
 */
export function SmsWebhook() {
  const { organizationId } = useAccountOrg();
  const query = useQuery({
    queryKey: ["organization", "connections", "sms", "webhook", organizationId],
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: () =>
      connectionsService.smsWebhookSetup(organizationId ?? undefined),
  });

  if (query.isLoading) return <Skeleton className="h-16 w-full rounded-lg" />;
  if (query.error) {
    return <p className="text-xs text-destructive">{query.error.message}</p>;
  }
  if (!query.data) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        In Twilio, set your number&apos;s{" "}
        <span className="font-medium text-foreground">
          &quot;A message comes in&quot;
        </span>{" "}
        webhook (HTTP POST) to this URL. It handles opt-in replies and STOP.
      </p>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Webhook URL</div>
        <div className="flex items-center gap-1.5">
          <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs text-foreground">
            {query.data.webhookUrl}
          </code>
          <CopyButton value={query.data.webhookUrl} label="Copy webhook URL" />
        </div>
      </div>
    </div>
  );
}
