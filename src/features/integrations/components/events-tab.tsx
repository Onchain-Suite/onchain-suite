"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { connectionsService } from "../connections.service";
import { contractsTile, productEventsTile } from "../utils/events";
import { ContractsView } from "./events/contracts-view";
import { EventsHealth } from "./events/events-health";
import { ProductEvents } from "./events/product-events";
import { ImportContractsDialog } from "@/features/audience/components/import-contracts-dialog";
import {
  projectSettingsKey,
  supportedChainsKey,
} from "@/features/settings/components/account/project-card";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";
import { projectSettingsService } from "@/features/settings/project-settings.service";
import { Segmented } from "@/shared/components/page/segmented";

type View = "contracts" | "product";

/**
 * The Events tab (2.7): the inputs Loops and segments are built on. Health
 * stays on top; under it the two lists are views of the same space, switched
 * by a segmented control, each filling the window and scrolling inside its
 * own box. Indexed contracts come from project settings; product events from
 * `GET /events/catalog` (what arrived through the events API lately).
 */
export function EventsTab() {
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<View>("contracts");
  const enabled = Boolean(organizationId);

  const settingsQuery = useQuery({
    queryKey: projectSettingsKey(organizationId),
    enabled,
    retry: false,
    queryFn: () =>
      projectSettingsService.getProjectSettings(organizationId ?? undefined),
  });

  const chainsQuery = useQuery({
    queryKey: supportedChainsKey(organizationId),
    enabled,
    retry: false,
    staleTime: 30 * 60 * 1000,
    queryFn: () =>
      projectSettingsService.getSupportedChains(organizationId ?? undefined),
  });

  // Read here, not in the pane, so the health tile and the tab's count are
  // right before the Product events view is opened.
  const catalogQuery = useQuery({
    queryKey: ["events", "catalog", organizationId],
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: () =>
      connectionsService.eventsCatalog(organizationId ?? undefined),
  });

  const contracts = useMemo(
    () =>
      (settingsQuery.data?.contractAddresses ?? []).filter((c) => c.address),
    [settingsQuery.data]
  );

  const chainLabel = useMemo(() => {
    const map = new Map((chainsQuery.data ?? []).map((c) => [c.slug, c.label]));
    return (slug?: string) => (slug ? (map.get(slug) ?? slug) : "-");
  }, [chainsQuery.data]);

  const eventCount = catalogQuery.data?.events.length;
  const tiles = useMemo(
    () => [
      contractsTile(settingsQuery.isSuccess ? contracts.length : null),
      productEventsTile(catalogQuery.isError ? null : catalogQuery.data),
    ],
    [
      settingsQuery.isSuccess,
      contracts.length,
      catalogQuery.isError,
      catalogQuery.data,
    ]
  );

  const options = useMemo(
    () => [
      {
        key: "contracts" as const,
        label: settingsQuery.isSuccess
          ? `Indexed contracts · ${contracts.length}`
          : "Indexed contracts",
      },
      {
        key: "product" as const,
        label:
          eventCount === undefined
            ? "Product events"
            : `Product events · ${eventCount}`,
      },
    ],
    [settingsQuery.isSuccess, contracts.length, eventCount]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5">
      <div className="shrink-0">
        <EventsHealth tiles={tiles} />
      </div>
      <Segmented
        className="shrink-0 self-start"
        label="Events to show"
        options={options}
        value={view}
        onChange={setView}
      />

      {view === "contracts" ? (
        <ContractsView
          contracts={contracts}
          isLoading={settingsQuery.isLoading}
          chainLabel={chainLabel}
          onAdd={() => setAdding(true)}
        />
      ) : (
        <ProductEvents
          catalog={catalogQuery.data}
          isLoading={catalogQuery.isLoading}
          error={catalogQuery.error ? catalogQuery.error.message : null}
        />
      )}

      <ImportContractsDialog
        open={adding}
        onOpenChange={setAdding}
        onImported={() => {
          queryClient
            .invalidateQueries({ queryKey: projectSettingsKey(organizationId) })
            .catch(() => undefined);
        }}
      />
    </div>
  );
}
