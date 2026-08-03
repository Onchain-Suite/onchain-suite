"use client";

import {
  CalendarIcon,
  ChevronDownIcon,
  EnvelopeIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

import { cn } from "@/lib/utils";

import { CampaignsAnalyticsOverview } from "../../campaigns/components/analytics-overview";
import { CampaignsCalendar } from "../../campaigns/components/calendar";
import { CreateCampaignSheet } from "../../campaigns/components/campaign-form/create-campaign-sheet";
import { CampaignsTable } from "../../campaigns/components/table";
import { campaignsService } from "../campaigns.service";
import type { CampaignStatus } from "../types/campaign";
import { templatesService } from "@/features/templates/templates.service";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

type ViewMode = "list" | "calendar" | "library";

const normalizeStatus = (value: unknown): CampaignStatus => {
  switch (value) {
    case "draft":
    case "scheduled":
    case "sending":
    case "sent":
    case "paused":
    case "failed":
      return value;
    default:
      return "draft";
  }
};

export function CampaignsListsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() ?? "";

  const filterTriggerClassName =
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20";

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignStatus>(
    "all"
  );
  const [typeFilter, setTypeFilter] = useState<
    "all" | "email-blast" | "smart-sending" | "newsletter" | "automation"
  >("all");
  const [dateRange, setDateRange] = useState<"all" | "30d">("30d");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateViewMode, setTemplateViewMode] = useState<"grid" | "list">(
    "grid"
  );

  useEffect(() => {
    const viewRaw = new URLSearchParams(searchParamsString).get("view");
    if (viewRaw === "list" || viewRaw === "calendar" || viewRaw === "library") {
      setViewMode(viewRaw);
    }
  }, [searchParamsString]);

  const updateViewMode = (next: ViewMode) => {
    setViewMode(next);
    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set("view", next);
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  const campaignsQuery = useQuery({
    queryKey: ["campaigns", "list"],
    queryFn: () => campaignsService.listCampaigns({ page: 1, limit: 200 }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const calendarQuery = useQuery({
    queryKey: ["campaigns", "calendar"],
    queryFn: () => campaignsService.getCalendar(),
    enabled: viewMode === "calendar",
    retry: false,
    refetchOnWindowFocus: false,
  });

  const templatesQuery = useQuery({
    queryKey: ["templates", "list", templateSearch],
    queryFn: () =>
      templatesService.list(
        templateSearch.trim().length > 0
          ? { search: templateSearch.trim(), limit: 50 }
          : { limit: 50 }
      ),
    enabled: viewMode === "library",
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createCampaignFromTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const created = await campaignsService.createCampaign({
        name: "Untitled campaign",
        type: "email-blast",
        status: "draft",
      });
      await campaignsService.setTemplate(created.id, { templateId });
      return created.id;
    },
    onSuccess: (createdCampaignId) => {
      const qs = new URLSearchParams();
      // Step 2 is the template step in the 3-step wizard.
      qs.set("step", "2");
      qs.set("campaign", createdCampaignId);
      router.push(`${PRIVATE_ROUTES.NEW_CAMPAIGN}?${qs.toString()}`);
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Failed to use template";
      toast.error(message);
    },
  });

  const campaigns = useMemo(
    () => campaignsQuery.data ?? [],
    [campaignsQuery.data]
  );
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredCampaigns = useMemo(() => {
    const cutoff =
      dateRange === "30d"
        ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        : null;

    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (cutoff && c.createdAt < cutoff) return false;

      if (normalizedQuery.length === 0) return true;
      const name = c.name.toLowerCase();
      const subject = c.subject.toLowerCase();
      return (
        name.includes(normalizedQuery) || subject.includes(normalizedQuery)
      );
    });
  }, [campaigns, dateRange, normalizedQuery, statusFilter, typeFilter]);

  const hasCampaigns = filteredCampaigns.length > 0;

  // GET /campaigns/calendar returns only *scheduled* campaigns, so merge it
  // with the full list — otherwise sent/draft/failed campaigns never appear
  // on the calendar. List rows are richer (type/subject), so they win on id
  // collisions; calendar-only rows are appended.
  const calendarCampaigns = useMemo(() => {
    const fromCalendar = (calendarQuery.data ?? []).map((item) => {
      const scheduledFor = item.scheduledFor
        ? new Date(String(item.scheduledFor))
        : undefined;
      const sentAt = item.sentAt ? new Date(String(item.sentAt)) : undefined;
      return {
        id: String(item.id ?? ""),
        name: String(item.name ?? "Untitled"),
        type: "email-blast" as const,
        status: normalizeStatus(item.status),
        subject: "",
        audience: [] as string[],
        // Calendar rows carry no audience info; undefined renders as "—".
        recipients: undefined as number | undefined,
        createdAt: new Date(),
        scheduledFor:
          scheduledFor && !Number.isNaN(scheduledFor.getTime())
            ? scheduledFor
            : undefined,
        sentAt: sentAt && !Number.isNaN(sentAt.getTime()) ? sentAt : undefined,
      };
    });
    const calendarById = new Map(fromCalendar.map((c) => [c.id, c]));
    const listIds = new Set(campaigns.map((c) => c.id));

    const merged = campaigns.map((c) => {
      const cal = calendarById.get(c.id);
      if (!cal) return c;
      return {
        ...c,
        scheduledFor: c.scheduledFor ?? cal.scheduledFor,
        sentAt: c.sentAt ?? cal.sentAt,
      };
    });
    const extras = fromCalendar.filter((c) => !listIds.has(c.id));
    return [...merged, ...extras];
  }, [calendarQuery.data, campaigns]);

  const filteredCalendarCampaigns = useMemo(() => {
    const cutoff =
      dateRange === "30d"
        ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        : null;

    return calendarCampaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (cutoff && c.createdAt < cutoff) return false;

      if (normalizedQuery.length === 0) return true;
      const name = c.name.toLowerCase();
      const subject = c.subject.toLowerCase();
      return (
        name.includes(normalizedQuery) || subject.includes(normalizedQuery)
      );
    });
  }, [calendarCampaigns, dateRange, normalizedQuery, statusFilter, typeFilter]);

  const dateRangeLabel = dateRange === "30d" ? "Last 30 days" : "All time";
  const typeLabel = (() => {
    switch (typeFilter) {
      case "email-blast":
        return "Email blast";
      case "newsletter":
        return "Newsletter";
      case "smart-sending":
        return "Smart campaign";
      case "automation":
        return "Automation";
      default:
        return "All types";
    }
  })();
  const statusLabel = (() => {
    switch (statusFilter) {
      case "draft":
        return "Draft";
      case "scheduled":
        return "Scheduled";
      case "sending":
        return "Sending";
      case "sent":
        return "Sent";
      case "paused":
        return "Paused";
      case "failed":
        return "Failed";
      default:
        return "All status";
    }
  })();

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, filter, and manage all of your campaigns from one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Campaigns view"
            className="flex items-center gap-1 rounded-full border border-border bg-card px-1 py-1 text-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "library"}
              onClick={() => updateViewMode("library")}
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20",
                viewMode === "library"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Squares2X2Icon className="h-3.5 w-3.5" aria-hidden="true" />
              View library
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "list"}
              onClick={() => updateViewMode("list")}
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListBulletIcon className="h-3.5 w-3.5" aria-hidden="true" />
              List
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "calendar"}
              onClick={() => updateViewMode("calendar")}
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20",
                viewMode === "calendar"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Calendar
            </button>
          </div>
          <CreateCampaignSheet>
            <Button size="sm" className="rounded-xl">
              <PlusIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              Create campaign
            </Button>
          </CreateCampaignSheet>
        </div>
      </div>

      {viewMode === "list" ? <CampaignsAnalyticsOverview /> : null}

      {viewMode !== "library" ? (
        <div className="mx-2 mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:mx-0">
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={filterTriggerClassName}>
                  <span>{dateRangeLabel}</span>
                  <ChevronDownIcon
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              >
                <DropdownMenuRadioGroup
                  value={dateRange}
                  onValueChange={(value) => {
                    const next = value === "all" ? "all" : "30d";
                    setDateRange(next);
                  }}
                >
                  <DropdownMenuRadioItem
                    value="30d"
                    className="transition-colors"
                  >
                    Last 30 days
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="all"
                    className="transition-colors"
                  >
                    All time
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={filterTriggerClassName}>
                  <span>Type: {typeLabel}</span>
                  <ChevronDownIcon
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              >
                <DropdownMenuRadioGroup
                  value={typeFilter}
                  onValueChange={(value) => {
                    const next = value as
                      | "all"
                      | "email-blast"
                      | "smart-sending"
                      | "newsletter"
                      | "automation";
                    setTypeFilter(next);
                  }}
                >
                  <DropdownMenuRadioItem
                    value="all"
                    className="transition-colors"
                  >
                    All types
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="email-blast"
                    className="transition-colors"
                  >
                    Email blast
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="newsletter"
                    className="transition-colors"
                  >
                    Newsletter
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="smart-sending"
                    className="transition-colors"
                  >
                    Smart campaign
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="automation"
                    className="transition-colors"
                  >
                    Automation
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={filterTriggerClassName}>
                  <span>Status: {statusLabel}</span>
                  <ChevronDownIcon
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              >
                <DropdownMenuRadioGroup
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as "all" | CampaignStatus)
                  }
                >
                  <DropdownMenuRadioItem
                    value="all"
                    className="transition-colors"
                  >
                    All status
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="draft"
                    className="transition-colors"
                  >
                    Draft
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="scheduled"
                    className="transition-colors"
                  >
                    Scheduled
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="sending"
                    className="transition-colors"
                  >
                    Sending
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="sent"
                    className="transition-colors"
                  >
                    Sent
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="paused"
                    className="transition-colors"
                  >
                    Paused
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="failed"
                    className="transition-colors"
                  >
                    Failed
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : (
        <div className="mx-2 mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:mx-0">
          <div className="relative w-full sm:w-80">
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              placeholder="Search templates..."
              className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTemplateViewMode("grid")}
              className={cn(
                filterTriggerClassName,
                templateViewMode === "grid" && "bg-accent/20"
              )}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setTemplateViewMode("list")}
              className={cn(
                filterTriggerClassName,
                templateViewMode === "list" && "bg-accent/20"
              )}
            >
              List
            </button>
          </div>
        </div>
      )}

      {viewMode === "library" ? (
        templatesQuery.isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Loading library...
          </div>
        ) : templatesQuery.isError ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Failed to load library.
          </div>
        ) : templatesQuery.data && templatesQuery.data.length > 0 ? (
          <div
            className={cn(
              "gap-3 transition-all duration-300",
              templateViewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                : "flex flex-col"
            )}
          >
            {templatesQuery.data.map((t) => {
              const updated =
                t.updatedAt && t.updatedAt.trim().length > 0
                  ? new Date(t.updatedAt).toLocaleString()
                  : "Saved";
              const previewSrc =
                t.previewUrl && t.previewUrl.trim().length > 0
                  ? t.previewUrl
                  : "/placeholder.svg";

              return (
                <div
                  key={t.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-lg"
                >
                  <div className="aspect-3/2 bg-muted relative overflow-hidden">
                    {/* unoptimized: preview URLs come from arbitrary hosts;
                        the image loader throws (crashing the view) for any
                        host missing from next.config remotePatterns. */}
                    <Image
                      src={previewSrc}
                      alt={t.name}
                      fill
                      unoptimized
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {t.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {updated}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 rounded-xl"
                      disabled={
                        createCampaignFromTemplateMutation.isPending &&
                        createCampaignFromTemplateMutation.variables === t.id
                      }
                      onClick={() =>
                        createCampaignFromTemplateMutation.mutate(t.id)
                      }
                    >
                      Use
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No templates found.
          </div>
        )
      ) : viewMode === "calendar" ? (
        calendarQuery.isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Loading calendar...
          </div>
        ) : calendarQuery.isError ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Failed to load calendar.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <CampaignsCalendar campaigns={filteredCalendarCampaigns} />
          </div>
        )
      ) : campaignsQuery.isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading campaigns...
        </div>
      ) : campaignsQuery.isError ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Failed to load campaigns.
        </div>
      ) : hasCampaigns ? (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <CampaignsTable data={filteredCampaigns} />
        </div>
      ) : campaigns.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No campaigns match your filters.
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <EnvelopeIcon
            className="mx-auto h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            You haven&apos;t created any campaigns yet
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Start by creating your first campaign. You can duplicate it later,
            schedule follow-ups, and view performance in this table.
          </p>
          <div className="mt-6 flex gap-3">
            <CreateCampaignSheet>
              <Button className="rounded-xl">
                <PlusIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                Create campaign
              </Button>
            </CreateCampaignSheet>
          </div>
        </div>
      )}
    </div>
  );
}
