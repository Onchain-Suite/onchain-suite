"use client";

import {
  Megaphone01Icon,
  PlusSignIcon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { useLocalStorage } from "@/hooks/client/use-local-storage";

import { campaignsService } from "../campaigns.service";
import { CampaignRowDialogs } from "../components/campaign-row-dialogs";
import { CampaignsAnswerLine } from "../components/campaigns-answer-line";
import { CampaignsReferenceTable } from "../components/campaigns-reference-table";
import { useDuplicateCampaign } from "../hooks/use-duplicate-campaign";
import type { Campaign, CampaignStatus } from "../types/campaign";
import { EmptyState } from "@/shared/components/common/empty-state";
import { hugeicon } from "@/shared/components/common/hugeicon";
import { SectionEmpty } from "@/shared/components/common/section-empty";
import {
  type FilterChip,
  FilterChips,
  validChip,
} from "@/shared/components/page/filter-chips";
import { PageHeader } from "@/shared/components/page/page-header";
import { TableSkeleton } from "@/shared/components/page/page-skeleton";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const PER_PAGE = 10;

const NewGlyph = hugeicon(PlusSignIcon, "NewGlyph");
const ImportGlyph = hugeicon(Upload04Icon, "ImportGlyph");
const CampaignGlyph = hugeicon(Megaphone01Icon, "CampaignGlyph");

type Filter = "all" | CampaignStatus;
const FILTERS: Filter[] = [
  "all",
  "sent",
  "scheduled",
  "draft",
  "paused",
  "sending",
  "failed",
];
const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  sent: "Sent",
  scheduled: "Scheduled",
  draft: "Draft",
  paused: "Paused",
  sending: "Sending",
  failed: "Failed",
};
/** Sending and Failed only get a chip while something is in them. */
const ALWAYS_SHOWN = new Set<Filter>([
  "all",
  "sent",
  "scheduled",
  "draft",
  "paused",
]);

/**
 * Campaigns, in the 2.7 frame: the title, one sentence on how the sends went,
 * New campaign on the right, then the status filters and the list. The four
 * stat cards and the Upcoming strip are gone: the sentence answers the same
 * question, and Home lists what is scheduled.
 */
export function CampaignsListsView() {
  // The filter you were on is the one you come back to.
  const { value: storedFilter, setValue: setStoredFilter } =
    useLocalStorage<string>("campaigns-filter", "all");
  const statusFilter = validChip<Filter>(storedFilter, FILTERS, "all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Campaign | null>(null);
  const router = useRouter();
  const duplicate = useDuplicateCampaign();

  const openDetail = (c: Campaign) =>
    router.push(`${PRIVATE_ROUTES.CAMPAIGNS}/${c.id}`);

  const campaignsQuery = useQuery({
    queryKey: ["campaigns", "list"],
    queryFn: () => campaignsService.listCampaigns({ page: 1, limit: 200 }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const campaigns = useMemo(
    () => campaignsQuery.data ?? [],
    [campaignsQuery.data]
  );

  const filteredCampaigns = useMemo(
    () =>
      statusFilter === "all"
        ? campaigns
        : campaigns.filter((c) => c.status === statusFilter),
    [campaigns, statusFilter]
  );

  // Paginate the filtered set. Clamp the page so a filter change that shrinks
  // the list can't strand you on an empty page.
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCampaigns.length / PER_PAGE)
  );
  const safePage = Math.min(page, totalPages);
  const pagedCampaigns = useMemo(
    () =>
      filteredCampaigns.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [filteredCampaigns, safePage]
  );

  const chips = useMemo((): FilterChip<Filter>[] => {
    const counts: Partial<Record<Filter, number>> = { all: campaigns.length };
    for (const c of campaigns) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return FILTERS.filter(
      (f) => ALWAYS_SHOWN.has(f) || (counts[f] ?? 0) > 0
    ).map((f) => ({ key: f, label: FILTER_LABEL[f], count: counts[f] ?? 0 }));
  }, [campaigns]);

  const hasCampaigns = campaigns.length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Campaigns"
        description={
          hasCampaigns ? (
            <CampaignsAnswerLine campaigns={campaigns} />
          ) : (
            "One message to many people, by email, in-app push, SMS or a post."
          )
        }
        actions={
          <Button asChild>
            <Link href={PRIVATE_ROUTES.NEW_CAMPAIGN} prefetch>
              <NewGlyph className="mr-1.5 size-4" />
              New campaign
            </Link>
          </Button>
        }
      />

      {hasCampaigns ? (
        <FilterChips
          label="Filter campaigns by status"
          chips={chips}
          value={statusFilter}
          onChange={(key) => {
            setStoredFilter(key);
            setPage(1);
          }}
        />
      ) : null}

      {campaignsQuery.isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredCampaigns.length > 0 ? (
        <>
          <CampaignsReferenceTable
            data={pagedCampaigns}
            onSelect={openDetail}
            onDuplicate={(c) => {
              // One at a time: a second click while the first is in flight
              // would make two copies.
              if (!duplicate.isPending) duplicate.mutate(c);
            }}
            onDelete={setDeleteTarget}
            onCancel={setCancelTarget}
          />
          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-1 text-sm text-muted-foreground">
              <span>
                Showing {(safePage - 1) * PER_PAGE + 1}–
                {Math.min(safePage * PER_PAGE, filteredCampaigns.length)} of{" "}
                {filteredCampaigns.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : campaigns.length > 0 ? (
        <EmptyState
          className="rounded-2xl border border-border bg-card"
          icon={Megaphone01Icon}
          title="No campaigns match this filter"
          description="Switch to All to see every campaign, or create one."
        />
      ) : campaignsQuery.isError ? (
        // The request failed. Keep a Retry so a transient failure isn't a dead end.
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load your campaigns just now - retry, or create a
            new one.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => campaignsQuery.refetch()}
            >
              Retry
            </Button>
            <Button asChild className="rounded-xl">
              <Link href={PRIVATE_ROUTES.NEW_CAMPAIGN} prefetch>
                <NewGlyph className="mr-2 size-4" />
                New campaign
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <SectionEmpty
          icon={CampaignGlyph}
          title="No campaigns yet"
          body="A campaign sends one message to an audience, by email, in-app push or X. Import contacts or collect them with a form, connect a channel, and you can send today."
          waits={false}
          action={{
            label: "New campaign",
            href: PRIVATE_ROUTES.NEW_CAMPAIGN,
            icon: NewGlyph,
          }}
          secondary={{
            label: "Import contacts",
            href: `${PRIVATE_ROUTES.AUDIENCE}/import-export`,
            icon: ImportGlyph,
          }}
          onChain="Want to message your holders too? They become an audience once a contract is indexed."
          preview={{
            kind: "table",
            columns: ["Campaign", "Channel", "Sent", "Opened", "Converted"],
          }}
        />
      )}

      <CampaignRowDialogs
        deleteTarget={deleteTarget}
        cancelTarget={cancelTarget}
        setDeleteTarget={setDeleteTarget}
        setCancelTarget={setCancelTarget}
      />
    </div>
  );
}
