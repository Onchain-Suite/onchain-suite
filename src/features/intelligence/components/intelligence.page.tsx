"use client";

import {
  ArrowTrendingUpIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { intelligenceService } from "../intelligence.service";
import { CreditMeter } from "./credit-meter";
import { EnrichmentControl } from "./enrichment-control";
import { QueryTab } from "./query";
import { ReportsTab, type SavedQueryReport } from "./reports";
import { SegmentsTab } from "./segments";

/** Tab ids that `/intelligence?tab=` accepts, so deep links can't land nowhere. */
const TAB_IDS = new Set(["chat", "sql", "segments", "reports"]);

export default function IntelligencePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get("tab") ?? null;
  const searchParamsString = searchParams?.toString() ?? "";

  const [activeTab, setActiveTab] = useState("chat");

  // Deep link support: /intelligence?tab=segments opens the Segments tab.
  // Other surfaces (e.g. the campaign audience step) link straight here.
  useEffect(() => {
    if (typeof tabFromUrl !== "string") return;
    if (!TAB_IDS.has(tabFromUrl)) return;
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);
  // A saved query the user opened from the Reports tab; seeds QueryTab on its
  // next mount (SQL runs re-open results by queryId, MCP runs pre-fill the
  // chat composer). Cleared when leaving the chat/SQL surfaces so a later
  // visit starts fresh.
  const [pendingSavedQuery, setPendingSavedQuery] =
    useState<SavedQueryReport | null>(null);

  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      if (tab !== "chat" && tab !== "sql") setPendingSavedQuery(null);
      // Keep the URL in step so the tab survives a reload and is shareable.
      const next = new URLSearchParams(searchParamsString);
      next.set("tab", tab);
      router.replace(`/intelligence?${next.toString()}`, { scroll: false });
    },
    [router, searchParamsString]
  );

  const handleOpenSavedQuery = useCallback(
    (item: SavedQueryReport) => {
      setPendingSavedQuery(item);
      // Route through handleTabChange so the URL tracks this jump too. The
      // target is always chat/sql, so the pending query is not cleared.
      handleTabChange(item.isMcp ? "chat" : "sql");
    },
    [handleTabChange]
  );

  const segmentsMetricsQuery = useQuery({
    queryKey: ["intelligence", "segments", "metrics"],
    queryFn: () => intelligenceService.getSegmentsMetrics(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const openEmailComposer = useCallback((_recipient: unknown) => {
    // setEmailRecipient(recipient);
    // setShowEmailComposer(true);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Intelligence
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyze on-chain data and create targeted segments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreditMeter />
          <EnrichmentControl />
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList className="h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1.5">
          <TabsTrigger
            value="chat"
            className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_10px_28px_-14px_rgba(86,112,255,0.9)]"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4" aria-hidden="true" />
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="sql"
            className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_10px_28px_-14px_rgba(86,112,255,0.9)]"
          >
            <CodeBracketIcon className="h-4 w-4" aria-hidden="true" />
            SQL
          </TabsTrigger>
          <TabsTrigger
            value="segments"
            className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_10px_28px_-14px_rgba(86,112,255,0.9)]"
          >
            <UserGroupIcon className="h-4 w-4" aria-hidden="true" />
            Segments
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary-foreground/20">
              {typeof segmentsMetricsQuery.data?.segmentsCount === "number"
                ? segmentsMetricsQuery.data.segmentsCount
                : "—"}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_10px_28px_-14px_rgba(86,112,255,0.9)]"
          >
            <ArrowTrendingUpIcon className="h-4 w-4" aria-hidden="true" />
            Reports
          </TabsTrigger>
        </TabsList>

        {activeTab === "chat" || activeTab === "sql" ? (
          <div className="space-y-4">
            <QueryTab
              activeSurface={activeTab === "chat" ? "chat" : "sql"}
              openEmailComposer={openEmailComposer}
              setActiveTab={handleTabChange}
              initialQueryId={
                pendingSavedQuery && !pendingSavedQuery.isMcp
                  ? pendingSavedQuery.queryId
                  : null
              }
              initialSql={
                pendingSavedQuery &&
                !pendingSavedQuery.isMcp &&
                pendingSavedQuery.query.length > 0
                  ? pendingSavedQuery.query
                  : undefined
              }
              initialChatPrompt={
                pendingSavedQuery?.isMcp ? pendingSavedQuery.query : undefined
              }
            />
          </div>
        ) : null}

        <TabsContent value="segments" className="space-y-4">
          <SegmentsTab
            openEmailComposer={openEmailComposer}
            savedSegments={[]}
            onDeleteSegment={() => {}}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ReportsTab onOpenSavedQuery={handleOpenSavedQuery} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
