"use client";

import {
  BoltIcon,
  CodeBracketIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ComponentType, SVGProps } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { ImportContractsDialog } from "@/features/audience/components/import-contracts-dialog";
import {
  projectSettingsKey,
  supportedChainsKey,
} from "@/features/settings/components/account/project-card";
import { useAccountOrg } from "@/features/settings/components/account/use-account-org";
import { projectSettingsService } from "@/features/settings/project-settings.service";

function shortAddress(addr: string): string {
  return addr.length > 18 ? `${addr.slice(0, 10)}…${addr.slice(-6)}` : addr;
}

/**
 * The Events tab: the inputs Loops trigger on. Indexed contracts are real (read
 * from project settings); product events need a backend that does not exist yet
 * (see migration/integrations.md), so that section is an honest empty state
 * pointing at the SDK/analytics connectors rather than seeded mock data.
 */
export function EventsTab() {
  const { organizationId } = useAccountOrg();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);

  const settingsQuery = useQuery({
    queryKey: projectSettingsKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: () =>
      projectSettingsService.getProjectSettings(organizationId ?? undefined),
  });

  const chainsQuery = useQuery({
    queryKey: supportedChainsKey(organizationId),
    enabled: Boolean(organizationId),
    retry: false,
    staleTime: 30 * 60 * 1000,
    queryFn: () =>
      projectSettingsService.getSupportedChains(organizationId ?? undefined),
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

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeading
            icon={BoltIcon}
            title="Indexed contracts"
            blurb="Every behavioural trigger comes from here. A contract we do not index is a wallet we cannot segment, score or message about."
          />
          <Button size="sm" onClick={() => setAdding(true)}>
            <PlusIcon aria-hidden="true" className="mr-1.5 size-4" />
            Add contract
          </Button>
        </div>

        {settingsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : contracts.length === 0 ? (
          <EmptyState text="No contracts indexed yet. Add one to start segmenting on-chain behaviour." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span>Contract</span>
              <span>Chain</span>
            </div>
            {contracts.map((c) => (
              <div
                key={`${c.chain ?? ""}-${c.address}`}
                className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {c.label ?? shortAddress(c.address)}
                  </span>
                  {c.label ? (
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {shortAddress(c.address)}
                    </span>
                  ) : null}
                </span>
                <span className="text-sm text-muted-foreground">
                  {chainLabel(c.chain)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeading
          icon={CodeBracketIcon}
          title="Product events"
          blurb="What customers do inside your own app, sent through the SDK. The other half of every segment that crosses both lanes."
        />
        <EmptyState text="No product events yet. They arrive through our SDK or a connected analytics source - connect one from the Sources tab." />
      </section>

      <ImportContractsDialog
        open={adding}
        onOpenChange={setAdding}
        onImported={() => {
          queryClient.invalidateQueries({
            queryKey: projectSettingsKey(organizationId),
          });
        }}
      />
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  blurb,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  blurb: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="max-w-xl text-xs text-muted-foreground">{blurb}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
