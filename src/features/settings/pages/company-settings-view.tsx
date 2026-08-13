"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { BrandingCard } from "../components/account/branding-card";
import { ContractsCard } from "../components/account/contracts-card";
import { ProjectCard } from "../components/account/project-card";
import { SenderIdentitiesCard } from "../components/account/sender-identities-card";
import { SenderVerificationCard } from "../components/account/sender-verification-card";
import { SmartSendingCard } from "../components/account/smart-sending-card";
import { TeamCard } from "../components/account/team-card";

/** Deep-link target used by launch-error CTAs (?section=sender-verification). */
const SENDER_VERIFICATION_SECTION_ID = "sender-verification";

/**
 * Account settings - protocol identity, indexed contracts, branding, sender
 * verification + addresses, and team. Reference-match flat cards; each card
 * owns its own real-API queries/mutations via {@link useAccountOrg}.
 */
export default function CompanySettingsView() {
  const searchParams = useSearchParams();
  const section = searchParams?.get("section") ?? null;

  useEffect(() => {
    if (section !== SENDER_VERIFICATION_SECTION_ID) return;
    const el = document.getElementById(SENDER_VERIFICATION_SECTION_ID);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section]);

  return (
    <div className="space-y-6">
      <ProjectCard />
      <ContractsCard />
      <BrandingCard />
      <div id={SENDER_VERIFICATION_SECTION_ID} className="scroll-mt-6">
        <SenderVerificationCard />
      </div>
      <SenderIdentitiesCard />
      <SmartSendingCard />
      <TeamCard />
    </div>
  );
}
