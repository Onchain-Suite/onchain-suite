"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BillingSettings from "../components/billing/billing";
import IntegrationsSettings from "../components/integrations/integrations";
import ProfileSettings from "../components/profile/profile";
import RewardsSettings from "../components/rewards/rewards";
import { tabs } from "../utils";
import CompanySettingsView from "./company-settings-view";
import { PageHeader } from "@/shared/components/page/page-header";
import { PageTabs } from "@/shared/components/page/page-tabs";
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
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, billing, and integrations."
      />

      <PageTabs
        tabs={visibleTabs}
        value={activeTab}
        onValueChange={selectTab}
        layoutId="settings-tabs"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mx-auto w-full max-w-6xl"
        >
          {activeTab === "profile" && <ProfileSettings />}
          {activeTab === "account" && <CompanySettingsView />}
          {activeTab === "billing" && isOwner && <BillingSettings />}
          {activeTab === "integrations" && <IntegrationsSettings />}
          {activeTab === "rewards" && <RewardsSettings />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
