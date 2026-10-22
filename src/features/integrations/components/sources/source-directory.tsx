"use client";

import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  Squares2X2Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ComponentType, SVGProps } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";

import { SOURCE_KINDS, SOURCES } from "../../data/sources";
import { useConnections } from "../../hooks/use-connections";
import {
  requestSource,
  useRequestedSources,
} from "../../hooks/use-requested-sources";
import type { DataSource, SourceKind, SourceStatus } from "../../types/sources";
import {
  fallbackSources,
  searchSources,
  sourceCount,
  sourcesOfKind,
  sourceStatus,
} from "../../utils/sources";
import { ConnectSourceDialog } from "./connect-source-dialog";
import { SourceCard } from "./source-card";
import { SourceDetail } from "./source-detail";
import { KIND_ICON } from "./source-visuals";
import { ImportContractsDialog } from "@/features/audience/components/import-contracts-dialog";
import { projectSettingsKey } from "@/features/settings/components/account/project-card";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";
import { projectSettingsService } from "@/features/settings/project-settings.service";

/**
 * The Sources tab: a search box over everything, a category rail for browsing,
 * and a detail + connect flow. Browse and search are different questions, so the
 * rail shows while idle and the search spans every category at once. A search
 * miss records the tool name (the honest ranking of what to build next) and
 * offers the two universal fallbacks.
 */
export function SourceDirectory() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<SourceKind | "all">("all");
  const [detail, setDetail] = useState<DataSource | null>(null);
  const [connecting, setConnecting] = useState<DataSource | null>(null);
  const [contractsOpen, setContractsOpen] = useState(false);
  const requested = useRequestedSources();

  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();

  // Live status: contracts from project settings, connectors from the saved
  // connections; anything with no backend reads as "soon".
  const settingsQuery = useQuery({
    queryKey: projectSettingsKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: () =>
      projectSettingsService.getProjectSettings(organizationId ?? undefined),
  });
  const contractCount = settingsQuery.data?.contractAddresses?.length ?? 0;
  const { connections } = useConnections();

  const statusFor = (s: DataSource): SourceStatus =>
    sourceStatus(s, connections, contractCount);

  // "Your contracts" opens the contract-import dialog; everything else opens
  // the connect dialog (a real form when the backend has the connector).
  const handleConnect = (s: DataSource) => {
    if (s.id === "contracts") {
      setContractsOpen(true);
      return;
    }
    setConnecting(s);
  };

  const term = q.trim();
  const results = useMemo(() => searchSources(q), [q]);

  const connectDialog = (
    <ConnectSourceDialog
      source={connecting}
      onOpenChange={(open) => {
        if (!open) setConnecting(null);
      }}
    />
  );

  const contractsDialog = (
    <ImportContractsDialog
      open={contractsOpen}
      onOpenChange={setContractsOpen}
      onImported={() => {
        queryClient.invalidateQueries({
          queryKey: projectSettingsKey(organizationId),
        });
      }}
    />
  );

  if (detail) {
    return (
      <>
        <SourceDetail
          source={detail}
          status={statusFor(detail)}
          onBack={() => setDetail(null)}
          onConnect={handleConnect}
        />
        {connectDialog}
        {contractsDialog}
      </>
    );
  }

  const groups = term
    ? [
        {
          id: "results",
          label: `${results.length} ${results.length === 1 ? "source" : "sources"}`,
          items: results,
        },
      ]
    : SOURCE_KINDS.filter((k) => cat === "all" || k.id === cat).map((k) => ({
        id: k.id,
        label: k.label,
        items: sourcesOfKind(k.id),
      }));

  const asked = requested.some((r) => r.toLowerCase() === term.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="relative max-w-xl">
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          aria-label="Search sources"
          placeholder="What do you already use? Privy, Segment, a spreadsheet, your contracts…"
          className="pl-9 pr-9"
        />
        {term ? (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <XMarkIcon aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* The rail is hidden while searching: a category filter and a search
            that already spans every category are two answers to one question. */}
        {!term ? (
          <nav
            aria-label="Source categories"
            className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col md:overflow-visible"
          >
            <RailButton
              active={cat === "all"}
              onClick={() => setCat("all")}
              icon={Squares2X2Icon}
              label="All"
              count={SOURCES.length}
            />
            {SOURCE_KINDS.map((k) => (
              <RailButton
                key={k.id}
                active={cat === k.id}
                onClick={() => setCat(k.id)}
                icon={KIND_ICON[k.icon]}
                label={k.label}
                count={sourceCount(k.id)}
              />
            ))}
          </nav>
        ) : null}

        <div className="min-w-0 flex-1 space-y-8">
          {term && results.length === 0 ? (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                No one-click connection for &ldquo;{term}&rdquo; yet
              </h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Tell us and it goes on the list - what people search for here is
                how we choose what to build next. Either way your data can come
                in today: post it to a webhook, or call <code>track()</code>{" "}
                from your own app.
              </p>
              {asked ? (
                <p className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircleIcon aria-hidden="true" className="size-4" />
                  Asked for. We&rsquo;ll email you when it lands.
                </p>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    if (requestSource(term))
                      toast.success(`Noted. We'll look at ${term}`);
                  }}
                >
                  <PlusIcon aria-hidden="true" className="mr-1.5 size-4" />
                  Ask for {term}
                </Button>
              )}
              <div className="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                {fallbackSources().map((s) => (
                  <SourceCard
                    key={s.id}
                    source={s}
                    status={statusFor(s)}
                    onOpen={setDetail}
                  />
                ))}
              </div>
            </section>
          ) : (
            groups.map((g) => (
              <section key={g.id} className="space-y-3">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {g.label}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((s) => (
                    <SourceCard
                      key={s.id}
                      source={s}
                      status={statusFor(s)}
                      onOpen={setDetail}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {connectDialog}
      {contractsDialog}
    </div>
  );
}

function RailButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      <span className="whitespace-nowrap">{label}</span>
      <span className="ml-auto text-xs text-muted-foreground">{count}</span>
    </button>
  );
}
