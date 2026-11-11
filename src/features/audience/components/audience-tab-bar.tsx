"use client";

import type { AudienceTab } from "./audience-answer-line";
import { PillTabs } from "@/shared/components/page/pill-tabs";

const TABS: { key: AudienceTab; label: string }[] = [
  { key: "contacts", label: "Contacts" },
  { key: "segments", label: "Segments" },
  { key: "lists", label: "Lists and tags" },
];

/**
 * Audience's three equal tabs (2.7): Contacts, Segments, Lists and tags.
 * Suppressed is a filter on Contacts, since suppressed people are contacts in
 * one particular state; `children` holds the tab's own controls on the right.
 */
export function AudienceTabBar({
  value,
  counts,
  onChange,
  children,
}: {
  value: AudienceTab;
  counts: Record<AudienceTab, number | undefined>;
  onChange: (tab: AudienceTab) => void;
  children?: React.ReactNode;
}) {
  const tabs = TABS.map((tab) => ({ ...tab, count: counts[tab.key] }));
  return (
    <PillTabs
      name="audience"
      label="Audience"
      tabs={tabs}
      value={value}
      onChange={onChange}
    >
      {children}
    </PillTabs>
  );
}
