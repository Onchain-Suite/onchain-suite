"use client";

import {
  ArrowsRightLeftIcon,
  BoltIcon,
  CircleStackIcon,
  CodeBracketIcon,
  PaperAirplaneIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { useCallback, useEffect, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SourceDirectory } from "../components/sources/source-directory";

/**
 * The Integrations screen shell (v2.7). One top-level screen with six tabs -
 * "every connection in and out: sources in, channels out". This step ports the
 * reference DataScreen frame + routing only; each tab's real content lands in
 * later migration steps (see migration/integrations.md). The `channels` tab is
 * built on the v2.7-channels branch and slots into this shell.
 */

interface IntegrationsTab {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** One-line summary of what the tab will hold. */
  blurb: string;
  /** Shown in the placeholder while the tab is being built. */
  note?: string;
}

const TABS: IntegrationsTab[] = [
  {
    id: "sources",
    label: "Sources",
    icon: CircleStackIcon,
    blurb:
      "Where wallets and contacts come from: wallet auth, on-chain, files, product analytics and pipes.",
  },
  {
    id: "events",
    label: "Events",
    icon: BoltIcon,
    blurb: "Indexed contracts and the product events your Loops trigger on.",
  },
  {
    id: "migrate",
    label: "Migrate",
    icon: ArrowsRightLeftIcon,
    blurb: "Bring your lists and history over from another tool.",
  },
  {
    id: "channels",
    label: "Channels",
    icon: PaperAirplaneIcon,
    blurb: "How messages reach people: email, push and social.",
    note: "Built on the v2.7-channels branch; it slots into this tab.",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    icon: SignalIcon,
    blurb: "Outbound webhooks so your own systems react to what happens here.",
  },
  {
    id: "api",
    label: "API",
    icon: CodeBracketIcon,
    blurb: "API keys and the endpoint reference for building on OnchainSuite.",
  },
];

const TAB_IDS = new Set(TABS.map((t) => t.id));
const DEFAULT_TAB = "sources";

// Left-aligned underline tabs. The shadcn TabsTrigger bakes in flex-1 + a boxed
// active fill; neutralize those and colour only the active bottom border, so the
// bar reads like the rest of the app (matches the Intelligence screen).
const TAB_TRIGGER_CLASS =
  "relative h-auto flex-none gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-1 pb-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:border-b-primary dark:data-[state=active]:bg-transparent";

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get("tab") ?? null;
  const searchParamsString = searchParams?.toString() ?? "";

  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);

  useEffect(() => {
    if (typeof tabFromUrl !== "string") return;
    if (!TAB_IDS.has(tabFromUrl)) return;
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      const next = new URLSearchParams(searchParamsString);
      next.set("tab", tab);
      router.replace(`/integrations?${next.toString()}`, { scroll: false });
    },
    [router, searchParamsString]
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-6">
      <header className="flex shrink-0 flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Integrations
        </h1>
        <p className="text-sm text-muted-foreground">
          Every connection in and out: where wallets come from, and how messages
          reach them.
        </p>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col gap-6"
      >
        <TabsList className="h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-0 border-b border-border bg-transparent p-0">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={TAB_TRIGGER_CLASS}
            >
              <tab.icon aria-hidden="true" className="size-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="min-h-0">
            {tab.id === "sources" ? (
              <SourceDirectory />
            ) : (
              <TabPlaceholder tab={tab} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/** Temporary empty state per tab until its real content is migrated. */
function TabPlaceholder({ tab }: { tab: IntegrationsTab }) {
  const Icon = tab.icon;
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{tab.label}</p>
        <p className="mx-auto max-w-md text-xs text-muted-foreground">
          {tab.blurb}
        </p>
        {tab.note ? (
          <p className="mx-auto max-w-md text-xs text-muted-foreground/80">
            {tab.note}
          </p>
        ) : null}
      </div>
      <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        In migration
      </span>
    </div>
  );
}
