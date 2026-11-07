"use client";

import { OptInLinkCard } from "./opt-in-link-card";
import { connectionsService } from "@/features/integrations/connections.service";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";

/**
 * SMS opt-in: an `sms:` link (or the number + message) the contact texts back.
 * The inbound webhook binds their number when the message arrives.
 */
export function SmsOptInCard() {
  const { organizationId } = useAccountOrg();
  return (
    <OptInLinkCard
      inputId="sms-optin-wallet"
      description="Generate a link for a contact to text back. They become reachable on SMS only after they send it, so you have their consent on record."
      mint={(walletAddress) =>
        connectionsService.smsOptInLink(
          walletAddress,
          organizationId ?? undefined
        )
      }
      rows={(link) => [
        { label: "Opt-in link", value: link.url },
        { label: "Or text this to", value: link.smsNumber },
        { label: "Message", value: link.body },
      ]}
    />
  );
}
