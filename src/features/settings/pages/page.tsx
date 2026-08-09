"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BillingSettings from "../components/billing/billing";
import IntegrationsSettings from "../components/integrations/integrations";
import PrivacyIdentitySettings from "../components/privacy/privacy";
import ProfileSettings from "../components/profile/profile";
import RewardsSettings from "../components/rewards/rewards";
import { SettingsNav } from "../components/settings-nav";
import { tabs } from "../utils";
import CompanySettingsView from "./company-settings-view";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get("tab") ?? null;
  const searchParamsString = searchParams?.toString() ?? "";

  // Billing is owner-only (backend enforces with a 403; this hides the tab so
  // team members never see it). Role null (loading/unknown) counts as
  // not-owner so the tab can't flash for members.
  const { role } = useMyOrgRole();
  const isOwner = role === "OWNER";
  const visibleTabs = useMemo(
    () => (isOwner ? tabs : tabs.filter((t) => t.id !== "billing")),
    [isOwner]
  );

  const tabIds = useMemo(
    () => new Set(visibleTabs.map((t) => t.id)),
    [visibleTabs]
  );
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (typeof tabFromUrl !== "string") return;
    if (!tabIds.has(tabFromUrl)) return;
    setActiveTab(tabFromUrl);
  }, [tabFromUrl, tabIds]);

  // Deep-linked /settings?tab=billing for a non-owner: bounce to profile.
  useEffect(() => {
    if (activeTab === "billing" && !isOwner) setActiveTab("profile");
  }, [activeTab, isOwner]);

  const selectTab = (id: string) => {
    setActiveTab(id);
    const next = new URLSearchParams(searchParamsString);
    next.set("tab", id);
    router.replace(`/settings?${next.toString()}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:gap-12">
      <aside className="lg:w-56 lg:shrink-0">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <SettingsNav
          items={visibleTabs}
          value={activeTab}
          onValueChange={selectTab}
          className="lg:sticky lg:top-6"
        />
      </aside>

      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-6"
          >
            {activeTab === "profile" && <ProfileSettings />}
            {activeTab === "account" && <CompanySettingsView />}
            {activeTab === "privacy" && <PrivacyIdentitySettings />}
            {activeTab === "billing" && isOwner && <BillingSettings />}
            {activeTab === "integrations" && <IntegrationsSettings />}
            {activeTab === "rewards" && <RewardsSettings />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
