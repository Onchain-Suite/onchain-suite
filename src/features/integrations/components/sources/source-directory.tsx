"use client";

import {
  CheckmarkCircle02Icon,
  GridViewIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

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
import { DirectoryFrame, DirectoryGroup } from "../directory/directory-frame";
import { DirectoryRail, type RailItem } from "../directory/directory-rail";
import { DirectorySearch } from "../directory/directory-search";
import { ConnectSourceDialog } from "./connect-source-dialog";
import { SourceCard } from "./source-card";
import { SourceDetail } from "./source-detail";
import { KIND_ICON } from "./source-visuals";
import { ImportContractsDialog } from "@/features/audience/components/import-contracts-dialog";
import { projectSettingsKey } from "@/features/settings/components/account/project-card";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";
import { projectSettingsService } from "@/features/settings/project-settings.service";
import { Icon } from "@/shared/components/common/hugeicon";

const RAIL_ICON = "size-[15px] shrink-0";

/** Every category with how many sources it holds: static, so built once. */
const RAIL: RailItem<SourceKind | "all">[] = [
  {
    key: "all",
    label: "All",
    icon: <Icon icon={GridViewIcon} className={RAIL_ICON} />,
    count: SOURCES.length,
  },
  ...SOURCE_KINDS.map((k) => ({
    key: k.id,
    label: k.label,
    icon: <Icon icon={KIND_ICON[k.icon]} className={RAIL_ICON} />,
    count: sourceCount(k.id),
  })),
];

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
        <div className="min-h-0 flex-1 md:overflow-y-auto md:pr-1">
          <SourceDetail
            source={detail}
            status={statusFor(detail)}
            onBack={() => setDetail(null)}
            onConnect={handleConnect}
          />
        </div>
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
    <>
      <DirectoryFrame
        search={
          <DirectorySearch
            value={q}
            onChange={setQ}
            label="Search sources"
            placeholder="What do you already use? Privy, Segment, a spreadsheet, your contracts…"
          />
        }
        // The rail is hidden while searching: a category filter and a search
        // that already spans every category are two answers to one question.
        rail={
          term ? undefined : (
            <DirectoryRail
              label="Source categories"
              items={RAIL}
              value={cat}
              onChange={setCat}
            />
          )
        }
      >
        {term && results.length === 0 ? (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-(--text-primary)">
              No one-click connection for &ldquo;{term}&rdquo; yet
            </h2>
            <p className="max-w-xl text-sm text-(--text-secondary)">
              Tell us and it goes on the list - what people search for here is
              how we choose what to build next. Either way your data can come in
              today: post it to a webhook, or call <code>track()</code> from
              your own app.
            </p>
            {asked ? (
              <p className="inline-flex items-center gap-1.5 text-sm text-(--status-success-text)">
                <Icon icon={CheckmarkCircle02Icon} className="size-4" />
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
                <Icon icon={PlusSignIcon} className="mr-1.5 size-4" />
                Ask for {term}
              </Button>
            )}
            <div className="grid gap-3 pt-2 sm:grid-cols-2 xl:grid-cols-3">
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
            <DirectoryGroup key={g.id} label={g.label}>
              {g.items.map((s) => (
                <SourceCard
                  key={s.id}
                  source={s}
                  status={statusFor(s)}
                  onOpen={setDetail}
                />
              ))}
            </DirectoryGroup>
          ))
        )}
      </DirectoryFrame>

      {connectDialog}
      {contractsDialog}
    </>
  );
}
