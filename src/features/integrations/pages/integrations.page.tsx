"use client";

import {
  ArrowDataTransferHorizontalIcon,
  Database01Icon,
  FlashIcon,
  SentIcon,
  SourceCodeIcon,
  WebhookIcon,
} from "@hugeicons/core-free-icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { ApiTab } from "../components/developer/api-tab";
import { WebhooksPanel } from "../components/developer/webhooks-panel";
import { EventsTab } from "../components/events-tab";
import { IntegrationsAnswerLine } from "../components/integrations-answer-line";
import { MigrateList } from "../components/migrate/migrate-list";
import { SourceDirectory } from "../components/sources/source-directory";
import { CONNECTORS } from "../data/connectors";
import { oauthReturnMessage } from "../utils/connections";
import { ChannelsTab } from "@/features/channels/components/channels-tab";
import { PageHeader } from "@/shared/components/page/page-header";
import {
  type PillTab,
  pillTabId,
  PillTabs,
} from "@/shared/components/page/pill-tabs";

/**
 * Integrations (2.7): every connection to something outside, sources in and
 * channels out, on one screen with six tabs. The header and the tabs stay put
 * and each tab moves inside the space under them, so the page fits the window:
 * Sources, Events, Migrate, Webhooks and API lay out their own scrolling
 * boxes, and Channels scrolls as one. Below md the page scrolls as usual.
 */

type TabId = "sources" | "events" | "migrate" | "channels" | "webhooks" | "api";

const TABS: PillTab<TabId>[] = [
  { key: "sources", label: "Sources", icon: Database01Icon },
  { key: "events", label: "Events", icon: FlashIcon },
  { key: "migrate", label: "Migrate", icon: ArrowDataTransferHorizontalIcon },
  { key: "channels", label: "Channels", icon: SentIcon },
  { key: "webhooks", label: "Webhooks", icon: WebhookIcon },
  { key: "api", label: "API", icon: SourceCodeIcon },
];

const DEFAULT_TAB: TabId = "sources";
const isTab = (v: string | null): v is TabId => TABS.some((t) => t.key === v);

/** Tabs that lay out their own scrolling boxes inside the panel. */
const SELF_SCROLLING = new Set<TabId>([
  "sources",
  "events",
  "migrate",
  "webhooks",
  "api",
]);

export default function IntegrationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get("tab") ?? null;
  const searchParamsString = searchParams?.toString() ?? "";

  // Read from the address on the first render too, so a deep link to Channels
  // never paints Sources (and fires its reads) first.
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    isTab(tabFromUrl) ? tabFromUrl : DEFAULT_TAB
  );

  // The tab is in the address, so "Verify a sending domain" can link straight
  // to Channels and a reload keeps you where you were.
  useEffect(() => {
    if (isTab(tabFromUrl)) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // Back from an OAuth consent screen: say how it went, once, then drop the
  // params so a reload doesn't repeat it.
  const oauthHandled = useRef(false);
  const [reopen, setReopen] = useState<string | null>(null);
  useEffect(() => {
    if (oauthHandled.current) return;
    const params = new URLSearchParams(searchParamsString);
    const outcome = oauthReturnMessage({
      connected: params.get("connected"),
      error: params.get("error"),
      connector: params.get("connector"),
      label: (id) => CONNECTORS.get(id)?.label ?? id,
    });
    if (!outcome) return;
    oauthHandled.current = true;
    if (outcome.kind === "success") {
      toast.success(outcome.message);
      setReopen(params.get("connected"));
    } else {
      toast.error(outcome.message);
    }
    for (const k of ["connected", "error", "connector"]) params.delete(k);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParamsString]);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      const next = new URLSearchParams(searchParamsString);
      next.set("tab", tab);
      router.replace(`/integrations?${next.toString()}`, { scroll: false });
    },
    [router, searchParamsString]
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col md:h-full md:min-h-0">
      <PageHeader
        className="mb-5 shrink-0"
        title="Integrations"
        description={<IntegrationsAnswerLine />}
      />

      <PillTabs
        className="mb-3.5 shrink-0"
        name="integrations"
        label="Integrations section"
        tabs={TABS}
        value={activeTab}
        onChange={handleTabChange}
      />

      <div
        role="tabpanel"
        aria-labelledby={pillTabId("integrations", activeTab)}
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          !SELF_SCROLLING.has(activeTab) && "md:overflow-y-auto md:pr-1"
        )}
      >
        {activeTab === "sources" ? <SourceDirectory /> : null}
        {activeTab === "events" ? <EventsTab /> : null}
        {activeTab === "migrate" ? <MigrateList reopen={reopen} /> : null}
        {activeTab === "channels" ? <ChannelsTab /> : null}
        {activeTab === "webhooks" ? <WebhooksPanel /> : null}
        {activeTab === "api" ? <ApiTab /> : null}
      </div>
    </div>
  );
}
