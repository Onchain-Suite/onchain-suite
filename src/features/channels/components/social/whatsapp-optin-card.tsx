"use client";

import { OptInLinkCard } from "./opt-in-link-card";
import { connectionsService } from "@/features/integrations/connections.service";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";

/**
 * WhatsApp opt-in: a wa.me link that opens WhatsApp with the opt-in message
 * filled in. The contact sends it to your business number and the inbound
 * webhook binds their number. Until then WhatsApp cannot reach them.
 */
export function WhatsAppOptInCard() {
  const { organizationId } = useAccountOrg();
  return (
    <OptInLinkCard
      inputId="whatsapp-optin-wallet"
      description="Generate a link for a contact to open in WhatsApp and send. It fills in the message for them. They become reachable on WhatsApp only after they send it, so you have their opt-in on record."
      mint={(walletAddress) =>
        connectionsService.whatsappOptInLink(
          walletAddress,
          organizationId ?? undefined
        )
      }
      rows={(link) => [{ label: "Opt-in link", value: link.url }]}
    />
  );
}
