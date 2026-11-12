"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { AiSettingsCard } from "../components/account/ai-settings-card";
import { BrandingCard } from "../components/account/branding-card";
import { ContractsCard } from "../components/account/contracts-card";
import { FrequencyBudgetCard } from "../components/account/frequency-budget-card";
import { HoldoutCard } from "../components/account/holdout-card";
import { NftEnrichmentCard } from "../components/account/nft-enrichment-card";
import { ProfileCompletenessCard } from "../components/account/profile-completeness-card";
import { ProjectCard } from "../components/account/project-card";
import { SenderIdentitiesCard } from "../components/account/sender-identities-card";
import { SmartSendingCard } from "../components/account/smart-sending-card";
import { channelSetupHref } from "@/features/channels/data/channels";

/** Deep-link section ids scrolled to via ?section=<id> (e.g. from CTAs). */
const SENDER_ADDRESSES_SECTION_ID = "sender-addresses";
const CONTRACTS_SECTION_ID = "contracts";
const SCROLLABLE_SECTIONS = new Set([
  SENDER_ADDRESSES_SECTION_ID,
  CONTRACTS_SECTION_ID,
]);
/**
 * Sending domains and their DNS records moved to Integrations -> Channels ->
 * Email (2026-11-12). Links to the old section, in bookmarks and in mail
 * already sent, are sent on to where it is now.
 */
const MOVED_SENDER_VERIFICATION = "sender-verification";

/**
 * Account settings - protocol identity, indexed contracts, branding, sender
 * addresses, and team. Reference-match flat cards; each card
 * owns its own real-API queries/mutations via {@link useAccountOrg}.
 */
export default function CompanySettingsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams?.get("section") ?? null;

  useEffect(() => {
    if (section === MOVED_SENDER_VERIFICATION) {
      router.replace(channelSetupHref("email"));
      return;
    }
    if (!section || !SCROLLABLE_SECTIONS.has(section)) return;
    const el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section, router]);

  return (
    <div className="space-y-6">
      <ProfileCompletenessCard />
      <ProjectCard />
      <div id={CONTRACTS_SECTION_ID} className="scroll-mt-6">
        <ContractsCard />
      </div>
      <NftEnrichmentCard />
      <BrandingCard />
      <div id={SENDER_ADDRESSES_SECTION_ID} className="scroll-mt-6">
        <SenderIdentitiesCard />
      </div>
      <SmartSendingCard />
      <HoldoutCard />
      <AiSettingsCard />
      <FrequencyBudgetCard />
    </div>
  );
}
