"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import BillingSettings from "../components/billing/billing";
import IntegrationsSettings from "../components/integrations/integrations";
import PrivacyIdentitySettings from "../components/privacy/privacy";
import ProfileSettings from "../components/profile/profile";
import RewardsSettings from "../components/rewards/rewards";
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
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Settings
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        <nav aria-label="Settings sections" className="shrink-0 lg:w-56">
          <ul className="flex flex-col gap-1">
            {visibleTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => selectTab(tab.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <tab.icon className="size-4 shrink-0" aria-hidden="true" />
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
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
    </div>
  );
}
