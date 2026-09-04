"use client";

import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  ClockIcon,
  // CodeBracketIcon, // re-add when the hidden SQL tab is restored
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { cn } from "@/lib/utils";

import { intelligenceService } from "../intelligence.service";
import { toQueryHistoryItems } from "../utils/query-history";
import { QueryTab } from "./query";
import { SegmentsView } from "./segments/segments-view";
import { ContractAddressNudge } from "@/features/settings/components/contract-address-nudge";

/** Tab ids that `/intelligence?tab=` accepts, so deep links can't land nowhere. */
const TAB_IDS = new Set(["chat", "segments", "sql"]);

const timeAgo = (iso: string | null | undefined): string => {
  if (!iso) return "just now";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "just now";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

/** Reference header status: enriched-time + wallet count + a Refresh action. */
function EnrichmentStatus() {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({
    queryKey: ["intelligence", "enrichment", "status"],
    queryFn: () => intelligenceService.getEnrichmentStatus(),
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (q) => {
      const d = q.state.data as
        { pending?: number; idle?: boolean } | undefined;
      return d && (d.pending ?? 0) > 0 && d.idle === false ? 3000 : false;
    },
  });

  const enrichMutation = useMutation({
    mutationFn: () => intelligenceService.enrichProtocol(),
    onSuccess: async (res) => {
      const wallets = res?.walletsEnqueued ?? 0;
      toast.success(
        wallets > 0
          ? `Enriching ${wallets.toLocaleString()} wallets - metrics will populate shortly.`
          : "Enrichment started. Save contract addresses in Settings to seed more wallets."
      );
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "enrichment", "status"],
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.toUpperCase().includes("CREDITS_EXCEEDED") ||
        msg.includes("402")
      ) {
        toast.error(
          "Out of credits - top up the usage wallet or upgrade in Settings → Billing."
        );
        return;
      }
      toast.error(msg || "Failed to refresh enrichment");
    },
  });

  const status = statusQuery.data;
  const enriched = status?.enrichedWallets ?? 0;
  const pending = status?.pending ?? 0;
  const busy = enrichMutation.isPending || pending > 0;

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <CheckIcon aria-hidden="true" className="h-4 w-4 text-emerald-500" />
        Data enriched {timeAgo(status?.lastEnrichedAt)} ·{" "}
        {enriched.toLocaleString()} wallets
      </span>
      <button
        type="button"
        onClick={() => enrichMutation.mutate()}
        disabled={enrichMutation.isPending}
        className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-primary disabled:opacity-60"
      >
        <ArrowPathIcon
          aria-hidden="true"
          className={cn("h-4 w-4", busy && "animate-spin")}
        />
        Refresh
      </button>
    </div>
  );
}

export default function IntelligencePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get("tab") ?? null;
  const searchParamsString = searchParams?.toString() ?? "";

  const [activeTab, setActiveTab] = useState("chat");

  useEffect(() => {
    if (typeof tabFromUrl !== "string") return;
    if (!TAB_IDS.has(tabFromUrl)) return;
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      // History is a chat sub-view; leaving chat returns to the thread.
      if (tab !== "chat") setHistoryOpen(false);
      const next = new URLSearchParams(searchParamsString);
      next.set("tab", tab);
      router.replace(`/intelligence?${next.toString()}`, { scroll: false });
    },
    [router, searchParamsString]
  );

  const segmentsMetricsQuery = useQuery({
    queryKey: ["intelligence", "segments", "metrics"],
    queryFn: () => intelligenceService.getSegmentsMetrics(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const openEmailComposer = useCallback((_recipient: unknown) => {
    // Handled by the campaign flow; kept as a stable no-op here.
  }, []);

  const segmentsCount =
    typeof segmentsMetricsQuery.data?.segmentsCount === "number"
      ? segmentsMetricsQuery.data.segmentsCount
      : null;

  // History disclosure lives here so the tab-bar icon (right of Chat/Segments)
  // can drive the panel QueryTab renders. Shares the query key with QueryTab's
  // own read, so this adds no extra request; the count gates the icon.
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyQuery = useQuery({
    queryKey: ["intelligence", "query", "history"],
    queryFn: async () => {
      const res = await intelligenceService.getQueryHistory();
      const items = Array.isArray(res)
        ? res
        : ((res as { items?: unknown[] }).items ?? []);
      return Array.isArray(items) ? items : [];
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
  const historyCount = toQueryHistoryItems(historyQuery.data ?? []).length;

  // Left-aligned underline tabs. The shadcn TabsTrigger primitive bakes in
  // `flex-1` + a boxed active fill/shadow, so we explicitly neutralize those
  // (flex-none, transparent active bg in light AND dark, no shadow) and colour
  // only the bottom border on the active tab.
  const TAB_TRIGGER_CLASS =
    "relative h-auto flex-none gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-1 pb-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:border-b-primary dark:data-[state=active]:bg-transparent";

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-6">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Intelligence
        </h1>
        <EnrichmentStatus />
      </div>

      <div className="shrink-0">
        <ContractAddressNudge context="intelligence" />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col gap-6"
      >
        <div className="flex shrink-0 items-center gap-4 border-b border-border">
          <TabsList className="h-auto justify-start gap-6 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger value="chat" className={TAB_TRIGGER_CLASS}>
              <ChatBubbleLeftRightIcon aria-hidden="true" className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="segments" className={TAB_TRIGGER_CLASS}>
              <UserGroupIcon aria-hidden="true" className="h-4 w-4" />
              Segments
              {segmentsCount !== null ? (
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {segmentsCount}
                </span>
              ) : null}
            </TabsTrigger>
            {/* SQL surface is intentionally hidden until we finalize the direction.
                The tab, routing (?tab=sql) and QueryTab sql surface below stay
                wired so it can be re-enabled by restoring this trigger. */}
            {/* <TabsTrigger value="sql" className={TAB_TRIGGER_CLASS}>
              <CodeBracketIcon aria-hidden="true" className="h-4 w-4" />
              SQL
            </TabsTrigger> */}
          </TabsList>

          {/* History lives at the far right of the tab row, only in Agent chat
              and only when there are past runs; it toggles the panel below. */}
          {activeTab === "chat" && historyCount > 0 ? (
            <button
              type="button"
              aria-expanded={historyOpen}
              aria-label="Toggle query history"
              onClick={() => setHistoryOpen((v) => !v)}
              className={cn(
                "ml-auto mb-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                historyOpen
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ClockIcon aria-hidden="true" className="h-4 w-4" />
              History
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {historyCount}
              </span>
            </button>
          ) : null}
        </div>

        {activeTab === "chat" || activeTab === "sql" ? (
          <QueryTab
            activeSurface={activeTab === "chat" ? "chat" : "sql"}
            openEmailComposer={openEmailComposer}
            setActiveTab={handleTabChange}
            historyOpen={historyOpen}
            onHistoryOpenChange={setHistoryOpen}
            className={
              activeTab === "chat" ? "flex min-h-0 flex-1 flex-col" : undefined
            }
          />
        ) : null}

        <TabsContent
          value="segments"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto"
        >
          <SegmentsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
