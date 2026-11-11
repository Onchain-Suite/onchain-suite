"use client";

import { FlashIcon, PlusSignIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { shortAddress } from "../../utils/events";
import { EventsPane } from "./events-pane";
import { EventsEmpty, EventsRow, EventsTable } from "./events-table";
import type { ProjectSettingsAddressRow } from "@/features/settings/project-settings.service";
import { Icon } from "@/shared/components/common/hugeicon";

/** The contracts we index: where every on-chain trigger comes from. */
export function ContractsView({
  contracts,
  isLoading,
  chainLabel,
  onAdd,
}: {
  contracts: ProjectSettingsAddressRow[];
  isLoading: boolean;
  /** A chain's name from its key. */
  chainLabel: (slug?: string) => string;
  onAdd: () => void;
}) {
  return (
    <EventsPane
      icon={FlashIcon}
      title="Indexed contracts"
      blurb="Every on-chain trigger comes from here. A contract we do not index is a wallet we cannot segment, score or message about."
      action={
        <Button size="sm" onClick={onAdd}>
          <Icon icon={PlusSignIcon} className="mr-1.5 size-4" />
          Add contract
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-2" aria-hidden="true">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : contracts.length === 0 ? (
        <EventsEmpty>
          No contracts indexed yet. Add one and its holders become an audience,
          and its mints and swaps can start Loops. Everything else works without
          it.
        </EventsEmpty>
      ) : (
        <EventsTable
          columns="minmax(0,2fr) minmax(0,1fr)"
          head={
            <>
              <span>Contract</span>
              <span>Chain</span>
            </>
          }
        >
          {contracts.map((c) => (
            <EventsRow key={`${c.chain ?? ""}-${c.address}`}>
              <span className="flex min-w-0 flex-col gap-0.5">
                <b className="truncate text-[13.5px] font-medium text-(--text-primary)">
                  {c.label ?? shortAddress(c.address)}
                </b>
                {c.label ? (
                  <span className="truncate font-mono text-[11.5px] text-(--text-tertiary)">
                    {shortAddress(c.address)}
                  </span>
                ) : null}
              </span>
              <span className="truncate">{chainLabel(c.chain)}</span>
            </EventsRow>
          ))}
        </EventsTable>
      )}
    </EventsPane>
  );
}
