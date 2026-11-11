"use client";

import {
  ChartLineData01Icon,
  Clock01Icon,
  LayerIcon,
  Mail01Icon,
  PlusSignIcon,
  RepeatIcon,
  Search01Icon,
  TaskDaily01Icon,
} from "@hugeicons/core-free-icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useLocalStorage } from "@/hooks/client/use-local-storage";

import {
  automationService,
  type AutomationsListParams,
} from "../automation.service";
import { AutomationStatsView } from "../components/automation-stats-view";
import { DeleteLoopDialog } from "../components/delete-loop-dialog";
import { LoopsTable } from "../components/loops-table";
import { useDuplicateAutomation } from "../hooks/use-automations";
import {
  LOOP_STATUS_LABEL,
  type LoopRow,
  loopsAnswer,
  type LoopStatus,
  pickLoops,
  readTotal,
  toLoopRow,
} from "../utils/loop-rows";
import { ContractAddressNudge } from "@/features/settings/components/contract-address-nudge";
import { EmptyState } from "@/shared/components/common/empty-state";
import { hugeicon, Icon } from "@/shared/components/common/hugeicon";
import { SectionEmpty } from "@/shared/components/common/section-empty";
import {
  type FilterChip,
  FilterChips,
  validChip,
} from "@/shared/components/page/filter-chips";
import { PageHeader } from "@/shared/components/page/page-header";
import { TableSkeleton } from "@/shared/components/page/page-skeleton";
import { type PageTabItem, PageTabs } from "@/shared/components/page/page-tabs";
import { Button } from "@/shared/components/ui/button";

type Filter = "all" | LoopStatus;
const FILTERS: Filter[] = ["all", "active", "paused", "draft"];
const PER_PAGE = 10;

const NewGlyph = hugeicon(PlusSignIcon, "NewGlyph");
const LoopGlyph = hugeicon(RepeatIcon, "LoopGlyph");

const VIEW_TABS: PageTabItem[] = [
  { id: "automations", label: "Loops", icon: hugeicon(LayerIcon, "LoopsTab") },
  {
    id: "stats",
    label: "Stats",
    icon: hugeicon(ChartLineData01Icon, "StatsTab"),
  },
];

/**
 * Loops, in the 2.7 frame: the title, one sentence on what is live and what
 * it did (it replaced four stat tiles), New Loop on the right, then search,
 * the status filters and the list. Stats is a second view of the same page.
 */
export function AutomationsListView() {
  const [view, setView] = useState<"automations" | "stats">("automations");
  // The filter you were on is the one you come back to.
  const { value: storedFilter, setValue: setStoredFilter } =
    useLocalStorage<string>("loops-filter", "all");
  const filter = validChip<Filter>(storedFilter, FILTERS, "all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<LoopRow | null>(null);
  const router = useRouter();
  // A copy is made to be changed, so it opens in the builder straight away.
  const duplicate = useDuplicateAutomation((id) =>
    router.push(`/automations/${id}`)
  );

  // Debounce the search so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Any filter/search change starts back at page 1.
  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  // Server-side page: search uses /automations/search (status filters don't
  // apply mid-search); otherwise the status drives the list endpoint.
  const listQuery = useQuery({
    queryKey: ["automations", "list", { filter, search, page }],
    queryFn: () => {
      if (search) {
        return automationService.searchAutomations({
          q: search,
          page,
          limit: PER_PAGE,
        });
      }
      const params: AutomationsListParams = { page, limit: PER_PAGE };
      if (filter === "draft") params.tab = "drafts";
      else if (filter !== "all") params.status = filter;
      return automationService.listAutomations(params);
    },
    placeholderData: keepPreviousData,
    // The Stats view fans out over the same endpoints; the list stands down.
    enabled: view === "automations",
    retry: false,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(
    () =>
      pickLoops(listQuery.data)
        .map(toLoopRow)
        .filter((r): r is LoopRow => r !== null),
    [listQuery.data]
  );
  const total = useMemo(() => readTotal(listQuery.data), [listQuery.data]);
  const totalPages =
    total !== undefined ? Math.max(1, Math.ceil(total / PER_PAGE)) : undefined;
  const hasPrev = page > 1;
  // Without a total, a full page is the signal there may be more.
  const hasNext =
    totalPages !== undefined ? page < totalPages : rows.length >= PER_PAGE;

  // The header sentence reads the org-wide aggregate, not the current page.
  const metricsQuery = useQuery({
    queryKey: ["automations", "metrics"],
    queryFn: () => automationService.getMetrics(),
    enabled: view === "automations",
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  // Per-status counts for the chips: one cheap total read per status.
  const countsQuery = useQuery({
    queryKey: ["automations", "counts"],
    queryFn: async () => {
      const totalFor = (p: AutomationsListParams) =>
        automationService
          .listAutomations({ ...p, page: 1, limit: 1 })
          .then(readTotal)
          .catch(() => undefined);
      const [all, active, paused, draft] = await Promise.all([
        totalFor({}),
        totalFor({ status: "active" }),
        totalFor({ status: "paused" }),
        totalFor({ tab: "drafts" }),
      ]);
      return { all, active, paused, draft };
    },
    enabled: view === "automations",
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const counts = countsQuery.data;

  const chips = useMemo(
    (): FilterChip<Filter>[] =>
      FILTERS.map((f) => ({
        key: f,
        label: f === "all" ? "All" : LOOP_STATUS_LABEL[f],
        count: counts?.[f] ?? 0,
      })),
    [counts]
  );

  // A later page can empty out under you (the last Loop on it deleted): step
  // back a page rather than reading it as "no Loops at all".
  const emptyLaterPage = !listQuery.isFetching && rows.length === 0 && page > 1;
  useEffect(() => {
    if (emptyLaterPage) setPage((p) => Math.max(1, p - 1));
  }, [emptyLaterPage]);

  const m = metricsQuery.data;
  const nothingYet =
    !listQuery.isLoading &&
    rows.length === 0 &&
    page === 1 &&
    !search &&
    filter === "all";

  const description = m ? (
    <LoopsAnswerLine
      live={m.active}
      entries={m.entries + (m.optInEmailsSent ?? 0)}
      conversions={m.conversions}
      paused={counts?.paused ?? 0}
    />
  ) : (
    "Messages that send themselves when someone does something: signs up, buys, goes quiet."
  );

  const showingFrom = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const showingTo =
    total !== undefined
      ? Math.min(page * PER_PAGE, total)
      : (page - 1) * PER_PAGE + rows.length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Loops"
        description={nothingYet ? undefined : description}
        actions={
          <Button asChild>
            <Link href="/automations/new">
              <NewGlyph className="mr-1.5 size-4" />
              New Loop
            </Link>
          </Button>
        }
      />

      <PageTabs
        tabs={VIEW_TABS}
        value={view}
        onValueChange={(next) => setView(next as "automations" | "stats")}
        layoutId="automations-view-tabs"
      />

      {view === "stats" ? (
        <AutomationStatsView />
      ) : nothingYet ? (
        <SectionEmpty
          icon={LoopGlyph}
          title="No Loops yet"
          body="A Loop moves each person through steps you set when something happens: a form submitted, someone added to a list, a call booked. Build one now and it starts the moment the first person comes in."
          waits={false}
          action={{
            label: "New Loop",
            href: "/automations/new",
            icon: NewGlyph,
          }}
          onChain="Mints, swaps and wallets going quiet can start a Loop too, once a contract is indexed."
          preview={{
            kind: "flow",
            steps: [
              {
                icon: hugeicon(TaskDaily01Icon, "FormStep"),
                label: "Submits the signup form",
              },
              {
                icon: hugeicon(Mail01Icon, "EmailStep"),
                label: "Send “Welcome”",
              },
              { icon: hugeicon(Clock01Icon, "WaitStep"), label: "Wait 2 days" },
            ],
          }}
        />
      ) : (
        <>
          <ContractAddressNudge context="automation" />

          <div className="flex flex-wrap items-center gap-3">
            <label className="relative">
              <span className="sr-only">Search Loops</span>
              <Icon
                icon={Search01Icon}
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--text-tertiary)"
              />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search Loops..."
                className="h-9 w-64 rounded-lg border border-(--border-subtle) bg-card pr-3 pl-9 text-sm text-(--text-primary) outline-none placeholder:text-(--text-tertiary) focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </label>
            <FilterChips
              label="Filter Loops by status"
              chips={chips}
              value={filter}
              onChange={setStoredFilter}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-(--border-subtle) bg-card">
            {listQuery.isLoading ? (
              <TableSkeleton rows={5} />
            ) : rows.length > 0 ? (
              <LoopsTable
                rows={rows}
                onDuplicate={(row) => duplicate.mutate(row.id)}
                onDelete={setPendingDelete}
                duplicatingId={
                  duplicate.isPending ? (duplicate.variables ?? null) : null
                }
              />
            ) : (
              <EmptyState
                icon={RepeatIcon}
                title="No Loops match"
                description="Try a different search, or switch to All."
              />
            )}
          </div>

          {hasPrev || hasNext ? (
            <div className="flex items-center justify-between text-sm text-(--text-secondary)">
              <span>
                {total !== undefined ? (
                  <>
                    Showing {showingFrom.toLocaleString()}–
                    {showingTo.toLocaleString()} of {total.toLocaleString()}
                  </>
                ) : (
                  <>Page {page}</>
                )}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <DeleteLoopDialog
        pendingDelete={pendingDelete}
        setPendingDelete={setPendingDelete}
      />
    </div>
  );
}

function LoopsAnswerLine(props: {
  live: number;
  entries: number;
  conversions: number;
  paused: number;
}) {
  const a = loopsAnswer(props);
  return (
    <>
      <b>{a.lead}</b>. {a.detail} <b>{a.conversions}</b> of them converted
      afterwards.{a.stopped ? ` ${a.stopped}` : null}
    </>
  );
}

export default AutomationsListView;
