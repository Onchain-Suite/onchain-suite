"use client";

import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  TagIcon,
  TrashIcon,
  UserPlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { type ReactElement, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Skeleton } from "@/ui/skeleton";

import { isJsonObject } from "@/lib/utils";

import {
  type AudienceProfile,
  audienceService,
} from "@/features/audience/audience.service";
import { ApplyTagsPopover } from "@/features/audience/components/apply-tags-popover";
import {
  ComposeEmailDialog,
  type EmailRecipient,
} from "@/features/audience/components/compose-email-dialog";
import {
  deriveDisplayName,
  extractSocialHandles,
  extractWalletFields,
  formatAttributeValue,
  getChainMeta,
  getHealthColor,
  getStatusIcon,
  hashHue,
  HealthBar,
  isSyntheticWalletEmail,
  normalizeTags,
  prettifyKey,
} from "@/features/audience/utils";
import { PageHeader } from "@/shared/components/page/page-header";
import { TableSkeleton } from "@/shared/components/page/page-skeleton";

type SocialIconLinkProps = {
  href: string;
  label: string;
  children: ReactElement;
};

const SvgIcon = ({
  children,
  viewBox,
  className,
}: {
  children: React.ReactNode;
  viewBox: string;
  className?: string;
}) => {
  return (
    <svg
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className ?? "h-4 w-4"}
      fill="currentColor"
    >
      {children}
    </svg>
  );
};

const EnsLogo = () => (
  <SvgIcon viewBox="0 0 24 24" className="h-4 w-4 text-sky-500">
    <path d="M12 2l8 4.6v10.8L12 22l-8-4.6V6.6L12 2z" opacity="0.9" />
    <path
      d="M8.2 8.6h7.6v6.8H8.2V8.6zm1.6 1.6v3.6h4.4v-3.6H9.8z"
      fill="white"
    />
  </SvgIcon>
);

const XLogo = () => (
  <SvgIcon viewBox="0 0 24 24" className="h-4 w-4 text-foreground">
    <path d="M18.6 2H21l-6.6 7.6L22 22h-6.6l-5.1-6.6L4.7 22H2.3l7.1-8.2L2 2h6.7l4.6 6L18.6 2zm-1.2 18h1.3L7.3 3.9H6L17.4 20z" />
  </SvgIcon>
);

const DiscordLogo = () => (
  <SvgIcon viewBox="0 0 24 24" className="h-4 w-4 text-indigo-500">
    <path d="M19.5 5.4A15 15 0 0 0 16 4.2l-.3.6a13.4 13.4 0 0 1 3.1 1.2c-1.7-2.5-3.5-3.6-3.5-3.6A15.4 15.4 0 0 0 12 2a15.4 15.4 0 0 0-3.3.4S6.9 3.5 5.2 6a13.4 13.4 0 0 1 3.1-1.2L8 4.2A15 15 0 0 0 4.5 5.4C2.3 8.8 2 12.1 2 12.1c1.4 2.1 3.5 3.3 3.5 3.3l.8-1.1c-1.3-.4-1.9-1-1.9-1a9.8 9.8 0 0 0 17.2 0s-.6.6-1.9 1l.8 1.1s2.1-1.2 3.5-3.3c0 0-.3-3.3-2.5-6.7z" />
    <path
      d="M9.3 13.2c-.8 0-1.5-.7-1.5-1.6 0-.9.7-1.6 1.5-1.6s1.5.7 1.5 1.6c0 .9-.7 1.6-1.5 1.6zm5.4 0c-.8 0-1.5-.7-1.5-1.6 0-.9.7-1.6 1.5-1.6s1.5.7 1.5 1.6c0 .9-.7 1.6-1.5 1.6z"
      fill="white"
    />
  </SvgIcon>
);

const TelegramLogo = () => (
  <SvgIcon viewBox="0 0 24 24" className="h-4 w-4 text-sky-500">
    <path d="M21.6 4.6c.3-1.2-1-2.2-2.1-1.7L3.4 9.4c-1.3.5-1.2 2.4.2 2.8l4.1 1.2 1.6 5c.4 1.2 2 1.4 2.8.4l2.3-2.8 4.5 3.3c1 .7 2.4.2 2.7-1L21.6 4.6z" />
    <path
      d="M8.3 13.1l9.6-6c.2-.1.5.2.3.4l-7.9 7.2-.3 3.3-1.7-4.9z"
      fill="white"
      opacity="0.75"
    />
  </SvgIcon>
);

const SocialIconLink = ({ href, label, children }: SocialIconLinkProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={label}
        >
          {children}
        </a>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
};

export function AudiencePages(): ReactElement {
  const filterTriggerClassName =
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20";

  const queryClient = useQueryClient();
  const router = useRouter();

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<
    "name" | "healthScore" | "lastAction"
  >("healthScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCerebra, setShowCerebra] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isRefreshSpinning, setIsRefreshSpinning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [profileScopeFilter, setProfileScopeFilter] = useState<
    "all" | "verified" | "pending" | "unverified"
  >("all");
  const [engagementFilter, setEngagementFilter] = useState<
    "all" | "active" | "cooling" | "cold"
  >("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const itemsPerPage = 10;
  const normalizedQuery = debouncedSearchQuery.trim();
  const sortParam =
    sortField === "lastAction"
      ? "lastActionAt"
      : sortField === "healthScore"
        ? "healthScore"
        : "name";

  // Debounce user-driven search (~350ms) so we don't fetch on every keystroke.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [
    engagementFilter,
    normalizedQuery,
    profileScopeFilter,
    tagFilter,
    sortField,
    sortDirection,
  ]);

  const tagsQuery = useQuery({
    queryKey: ["audience", "tags"],
    queryFn: async () => {
      const res = await audienceService.listTags();
      const rows: unknown[] = Array.isArray(res)
        ? res
        : (res.items ?? res.data ?? []);
      return rows
        .map((row) =>
          isJsonObject(row) && typeof row.name === "string" ? row.name : ""
        )
        .filter((name) => name.length > 0);
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const availableTags = tagsQuery.data ?? [];

  const profilesQuery = useQuery<{
    items: AudienceProfile[];
    meta: unknown | null;
  }>({
    queryKey: [
      "audience",
      "profiles",
      {
        page: currentPage,
        limit: itemsPerPage,
        q: normalizedQuery.length > 0 ? normalizedQuery : undefined,
        status: profileScopeFilter !== "all" ? profileScopeFilter : undefined,
        engagement: engagementFilter !== "all" ? engagementFilter : undefined,
        tag: tagFilter !== "all" ? tagFilter : undefined,
        sort: sortParam,
        direction: sortDirection,
        include: "wallets,attributes,tags,health,lastAction",
      },
    ],
    queryFn: async () => {
      const res = await audienceService.listProfiles({
        page: currentPage,
        limit: itemsPerPage,
        q: normalizedQuery.length > 0 ? normalizedQuery : undefined,
        status: profileScopeFilter !== "all" ? profileScopeFilter : undefined,
        engagement: engagementFilter !== "all" ? engagementFilter : undefined,
        tag: tagFilter !== "all" ? tagFilter : undefined,
        sort: sortParam,
        direction: sortDirection,
        include: "wallets,attributes,tags,health,lastAction",
      });
      if (Array.isArray(res)) return { items: res, meta: null };
      if (isJsonObject(res)) {
        const obj = res as Record<string, unknown>;
        const meta = obj.meta ?? null;
        if (Array.isArray(obj.items)) {
          return { items: obj.items as AudienceProfile[], meta };
        }
        if (Array.isArray(obj.data)) {
          return { items: obj.data as AudienceProfile[], meta };
        }
        if (isJsonObject(obj.data)) {
          const nested = obj.data as Record<string, unknown>;
          if (Array.isArray(nested.data)) {
            return {
              items: nested.data as AudienceProfile[],
              meta: nested.meta ?? meta,
            };
          }
        }
      }
      return { items: [], meta: null };
    },
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const overviewQuery = useQuery({
    queryKey: ["audience", "overview"],
    queryFn: () => audienceService.getOverview(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Full skeleton only for the initial load; page/filter changes keep the
  // previous rows rendered (keepPreviousData) instead of flashing a skeleton.
  const showPureLoading = profilesQuery.isPending;

  const profiles = useMemo(() => {
    if (profilesQuery.isSuccess && Array.isArray(profilesQuery.data?.items)) {
      return profilesQuery.data.items.map((p: AudienceProfile, idx: number) => {
        const lastAction = isJsonObject(p.lastAction) ? p.lastAction : {};
        const idRaw =
          typeof p.id === "string" && p.id.trim().length > 0
            ? p.id
            : `${idx + 1}`;
        const id = idRaw.trim();
        const emailRaw = typeof p.email === "string" ? p.email.trim() : "";
        // Synthetic wallet placeholder emails are not a real email channel.
        const email = isSyntheticWalletEmail(emailRaw) ? "" : emailRaw;
        const { walletFull, wallet } = extractWalletFields(p);
        const name = deriveDisplayName({
          name: p.name,
          fullName: (p as unknown as { fullName?: unknown }).fullName,
          email,
          wallet: walletFull,
          walletAddress: walletFull,
        });
        const tags = normalizeTags(p.tags);
        const healthObj = isJsonObject(
          (p as unknown as { health?: unknown }).health
        )
          ? ((p as unknown as { health?: unknown }).health as Record<
              string,
              unknown
            >)
          : null;
        const healthScoreRaw =
          healthObj && typeof healthObj.score === "number"
            ? healthObj.score
            : Number(p.healthScore);
        const healthScore = Number.isFinite(healthScoreRaw)
          ? healthScoreRaw
          : null;
        const status = typeof p.status === "string" ? p.status : "unverified";
        const chain =
          typeof (p as unknown as { chain?: unknown }).chain === "string"
            ? String((p as unknown as { chain?: unknown }).chain)
            : Array.isArray((p as unknown as { wallets?: unknown }).wallets) &&
                (p as unknown as { wallets?: Array<{ chain?: unknown }> })
                  .wallets?.[0] &&
                typeof (
                  p as unknown as { wallets?: Array<{ chain?: unknown }> }
                ).wallets?.[0]?.chain === "string"
              ? String(
                  (p as unknown as { wallets?: Array<{ chain?: unknown }> })
                    .wallets?.[0]?.chain
                )
              : "";
        const engagement = typeof p.engagement === "string" ? p.engagement : "";
        const attributes = isJsonObject(p.attributes) ? p.attributes : {};

        const label =
          typeof lastAction.label === "string" &&
          lastAction.label.trim().length > 0
            ? lastAction.label.trim()
            : "";
        const time =
          typeof lastAction.at === "string" && lastAction.at.trim().length > 0
            ? lastAction.at.trim()
            : typeof lastAction.time === "string" &&
                lastAction.time.trim().length > 0
              ? lastAction.time.trim()
              : "";

        return {
          id,
          name,
          email,
          wallet,
          walletFull,
          chain,
          healthScore,
          status,
          engagement,
          tags: tags.length ? tags : [],
          attributes,
          lastAction: {
            type: typeof lastAction.type === "string" ? lastAction.type : "",
            label,
            time,
          },
          healthTrend: String(
            (healthObj?.trend ?? p.healthTrend ?? "stable") as string
          ),
        };
      });
    }
    return [];
  }, [profilesQuery.isSuccess, profilesQuery.data?.items]);

  const meta = profilesQuery.data?.meta;
  const totalItems =
    isJsonObject(meta) &&
    typeof meta.totalItems === "number" &&
    meta.totalItems >= 0
      ? meta.totalItems
      : profiles.length;
  const totalPages =
    isJsonObject(meta) &&
    typeof meta.totalPages === "number" &&
    meta.totalPages > 0
      ? meta.totalPages
      : 1;
  const paginatedProfiles = profiles;

  const aggregatedStats = useMemo(() => {
    if (
      isJsonObject(overviewQuery.data) &&
      typeof overviewQuery.data.total === "number"
    ) {
      return {
        avgHealth:
          typeof overviewQuery.data.avgHealth === "number"
            ? overviewQuery.data.avgHealth
            : 0,
        activeCount:
          typeof overviewQuery.data.activeCount === "number"
            ? overviewQuery.data.activeCount
            : 0,
        coolingCount:
          typeof overviewQuery.data.coolingCount === "number"
            ? overviewQuery.data.coolingCount
            : 0,
        coldCount:
          typeof overviewQuery.data.coldCount === "number"
            ? overviewQuery.data.coldCount
            : 0,
        engagementTrend: 0,
        onchainTrend: 0,
        opensTrend: 0,
        total: overviewQuery.data.total,
      };
    }

    const scored = profiles.filter((p) => typeof p.healthScore === "number");
    const totalHealth = scored.reduce(
      (sum, p) => sum + (p.healthScore as number),
      0
    );
    const avgHealth =
      scored.length > 0 ? Math.round(totalHealth / scored.length) : 0;
    const activeCount = scored.filter(
      (p) => (p.healthScore as number) >= 70
    ).length;
    const coolingCount = scored.filter((p) => {
      const v = p.healthScore as number;
      return v >= 40 && v < 70;
    }).length;
    const coldCount = scored.filter(
      (p) => (p.healthScore as number) < 40
    ).length;
    const engagementTrend = Math.round(
      (activeCount / Math.max(1, scored.length)) * 100 - 50
    );
    // The backend overview does not expose period-over-period trend data yet,
    // so we do not fabricate on-chain/opens trends.
    const onchainTrend = 0;
    const opensTrend = 0;
    return {
      avgHealth,
      activeCount,
      coolingCount,
      coldCount,
      engagementTrend,
      onchainTrend,
      opensTrend,
      total: profiles.length,
    };
  }, [overviewQuery.data, profiles]);

  useEffect(() => {
    if (showCerebra && animatedScore < aggregatedStats.avgHealth) {
      const timer = setTimeout(() => {
        setAnimatedScore((prev) =>
          Math.min(prev + 1, aggregatedStats.avgHealth)
        );
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [showCerebra, animatedScore, aggregatedStats.avgHealth]);

  const handleSort = (field: "name" | "healthScore" | "lastAction") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleRowClick = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedProfiles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedProfiles.map((p) => p.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleRefreshCerebra = async () => {
    setIsRefreshSpinning(true);
    setIsGeneratingSummary(true);
    setAnimatedScore(0);
    try {
      await Promise.all([overviewQuery.refetch(), profilesQuery.refetch()]);
    } finally {
      setIsGeneratingSummary(false);
      setIsRefreshSpinning(false);
    }
  };

  const deleteProfilesMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((profileId) => audienceService.deleteProfile(profileId))
      );
    },
    onSuccess: async () => {
      setSelectedIds([]);
      setExpandedRow(null);
      await queryClient.invalidateQueries({
        queryKey: ["audience", "profiles"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["audience", "overview"],
      });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to delete profiles";
      toast.error(message);
    },
  });

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    deleteProfilesMutation.mutate(selectedIds);
  };

  const applyTagsMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      const cleaned = Array.from(
        new Set(tags.map((t) => t.trim()).filter((t) => t.length > 0))
      );
      if (cleaned.length === 0 || selectedIds.length === 0) return;
      // Register any brand-new tag names first (idempotent — ignore
      // "already exists" errors), then attach the full set to each profile.
      const known = new Set(availableTags.map((t) => t.toLowerCase()));
      await Promise.all(
        cleaned
          .filter((t) => !known.has(t.toLowerCase()))
          .map((name) =>
            audienceService.createTag({ name }).catch(() => undefined)
          )
      );
      await Promise.all(
        selectedIds.map((id) =>
          audienceService.addTagsToProfile(id, { tags: cleaned })
        )
      );
    },
    onSuccess: async (_data, tags) => {
      const count = selectedIds.length;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["audience", "profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["audience", "tags"] }),
      ]);
      toast.success(
        `Tagged ${count} profile${count === 1 ? "" : "s"} with ${tags.length} tag${
          tags.length === 1 ? "" : "s"
        }`
      );
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to apply tags";
      toast.error(message);
    },
  });

  // Selected profiles that have a real email channel — the direct-send set.
  const emailRecipients = useMemo<EmailRecipient[]>(
    () =>
      profiles
        .filter((p) => selectedIds.includes(p.id) && p.email.length > 0)
        .map((p) => ({ id: p.id, name: p.name, email: p.email })),
    [profiles, selectedIds]
  );

  const handleBulkExport = () => {
    const selectedProfiles = profiles.filter((p) => selectedIds.includes(p.id));
    const csv = [
      ["Name", "Email", "Wallet", "Chain", "Health Score", "Status"].join(","),
      ...selectedProfiles.map((p) =>
        [
          p.name,
          p.email,
          p.wallet,
          p.chain,
          typeof p.healthScore === "number" ? String(p.healthScore) : "",
          p.status,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audience-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    setSelectedIds([]);
  };

  const profileCount =
    (typeof overviewQuery.data?.total === "number"
      ? overviewQuery.data.total
      : profiles.length) || 0;

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="mx-auto w-full max-w-[1600px] space-y-6"
        aria-busy={showPureLoading}
      >
        <PageHeader
          title="Audience"
          description={
            showPureLoading
              ? undefined
              : `${profileCount} profiles in your audience`
          }
          actions={
            <>
              <button
                onClick={() => {
                  setShowCerebra(!showCerebra);
                  if (!showCerebra) setAnimatedScore(0);
                }}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${showCerebra ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent/20"}`}
              >
                <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                <span>Cerebra</span>
              </button>
              <Link
                href="/audience/import-export"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
                Add Profile
              </Link>
            </>
          }
        />

        {/* Cerebra Panel */}
        <AnimatePresence>
          {showCerebra && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="group relative rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/20 sm:py-6 sm:px-8">
                <button
                  onClick={handleRefreshCerebra}
                  className="absolute right-4 top-4 p-2 text-muted-foreground transition-colors hover:text-foreground sm:right-6 sm:top-6"
                  aria-label="Refresh Cerebra summary"
                >
                  <ArrowPathIcon
                    className={`h-4 w-4 ${isRefreshSpinning ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                {isGeneratingSummary ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <p className="text-lg font-light text-foreground leading-relaxed">
                      <span className="text-5xl font-extralight tracking-tighter text-foreground/90">
                        {animatedScore}
                      </span>
                      <span className="text-2xl font-extralight text-muted-foreground">
                        /100
                      </span>
                      <span className="ml-4 text-base font-light text-foreground/80">
                        : Engagement is{" "}
                        <span
                          className={
                            aggregatedStats.engagementTrend >= 0
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-rose-700 dark:text-rose-300"
                          }
                        >
                          {aggregatedStats.engagementTrend >= 0 ? "+" : ""}
                          {aggregatedStats.engagementTrend}%
                        </span>
                        , On-chain is{" "}
                        <span
                          className={
                            aggregatedStats.onchainTrend >= 0
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-rose-700 dark:text-rose-300"
                          }
                        >
                          {aggregatedStats.onchainTrend >= 0 ? "+" : ""}
                          {aggregatedStats.onchainTrend}%
                        </span>{" "}
                        and Opens is{" "}
                        <span
                          className={
                            aggregatedStats.opensTrend >= 0
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-rose-700 dark:text-rose-300"
                          }
                        >
                          {aggregatedStats.opensTrend >= 0 ? "+" : ""}
                          {aggregatedStats.opensTrend}%
                        </span>
                        . About {aggregatedStats.activeCount} of{" "}
                        {aggregatedStats.total} subscribers are actively engaged
                        · {aggregatedStats.coolingCount} showing declining
                        engagement · {aggregatedStats.coldCount} require
                        re-engagement
                      </span>
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <span className="text-sm font-medium text-primary">
                        → Target cooling users before they go inactive
                      </span>
                      <Link
                        href="/automations"
                        className="group/btn inline-flex items-center gap-2 rounded-lg border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        Create Automation
                        <ArrowRightIcon
                          className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {showPureLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {/* The real PageHeader is already rendered above — only the
                  toolbar + table regions are pending, so skeleton just those
                  (a second header skeleton here caused a duplicate-header
                  flash after the route-level loading state). */}
              <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <Skeleton className="h-10 w-full rounded-lg sm:w-64" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-10 w-32 rounded-lg" />
                    <Skeleton className="h-10 w-36 rounded-lg" />
                    <Skeleton className="h-10 w-28 rounded-lg" />
                  </div>
                </div>
                <TableSkeleton rows={8} />
              </div>
            </motion.div>
          ) : profilesQuery.isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl border border-border bg-card px-6 py-16 text-center"
            >
              <div className="text-sm text-muted-foreground">
                Failed to load audience.
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <div className="space-y-6">
                {/* Search and Filters */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:w-64">
                    <MagnifyingGlassIcon
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      placeholder="Search profiles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={filterTriggerClassName}
                        >
                          <span>
                            {profileScopeFilter === "all"
                              ? "All Profiles"
                              : profileScopeFilter === "verified"
                                ? "Verified"
                                : profileScopeFilter === "pending"
                                  ? "Pending"
                                  : "Unverified"}
                          </span>
                          <ChevronDownIcon
                            className="h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="rounded-lg shadow-md"
                      >
                        <DropdownMenuRadioGroup
                          value={profileScopeFilter}
                          onValueChange={(value) =>
                            setProfileScopeFilter(
                              value as
                                "all" | "verified" | "pending" | "unverified"
                            )
                          }
                        >
                          <DropdownMenuRadioItem value="all">
                            All Profiles
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="verified">
                            Verified
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="pending">
                            Pending
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="unverified">
                            Unverified
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={filterTriggerClassName}
                        >
                          <span>
                            {engagementFilter === "all"
                              ? "All engagement"
                              : engagementFilter === "active"
                                ? "Active"
                                : engagementFilter === "cooling"
                                  ? "Cooling"
                                  : "Cold"}
                          </span>
                          <ChevronDownIcon
                            className="h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="rounded-lg shadow-md"
                      >
                        <DropdownMenuRadioGroup
                          value={engagementFilter}
                          onValueChange={(value) =>
                            setEngagementFilter(
                              value as "all" | "active" | "cooling" | "cold"
                            )
                          }
                        >
                          <DropdownMenuRadioItem value="all">
                            All
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="active">
                            Active
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="cooling">
                            Cooling
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="cold">
                            Cold
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={filterTriggerClassName}
                        >
                          <span>
                            {tagFilter === "all" ? "All tags" : tagFilter}
                          </span>
                          <ChevronDownIcon
                            className="h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="rounded-lg shadow-md"
                      >
                        <DropdownMenuRadioGroup
                          value={tagFilter}
                          onValueChange={(value) => setTagFilter(value)}
                        >
                          <DropdownMenuRadioItem value="all">
                            All tags
                          </DropdownMenuRadioItem>
                          {availableTags.map((tagName) => (
                            <DropdownMenuRadioItem
                              key={tagName}
                              value={tagName}
                            >
                              {tagName}
                            </DropdownMenuRadioItem>
                          ))}
                          {availableTags.length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                              No tags yet — add tags to profiles to filter by
                              them.
                            </div>
                          ) : null}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {totalItems === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
                    <UserPlusIcon
                      className="h-8 w-8 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <h2 className="mt-4 text-lg font-semibold text-foreground">
                      No profiles yet
                    </h2>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      Import your audience or add your first profile to start
                      segmenting and sending campaigns.
                    </p>
                    <Link
                      href="/audience/import-export"
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
                      Add Profile
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="w-12 px-4 py-3">
                              <input
                                type="checkbox"
                                checked={
                                  selectedIds.length ===
                                    paginatedProfiles.length &&
                                  paginatedProfiles.length > 0
                                }
                                onChange={handleSelectAll}
                                className="h-4 w-4 rounded border-border"
                              />
                            </th>
                            <th className="px-4 py-3 text-left">
                              <button
                                onClick={() => handleSort("name")}
                                className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                              >
                                Profile
                                {sortField === "name" ? (
                                  sortDirection === "asc" ? (
                                    <ChevronUpIcon
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <ChevronDownIcon
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                  )
                                ) : (
                                  <ArrowsUpDownIcon
                                    className="h-3 w-3 opacity-50"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            </th>
                            <th className="hidden px-4 py-3 text-left sm:table-cell">
                              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Wallet
                              </span>
                            </th>
                            <th className="hidden px-4 py-3 text-left md:table-cell">
                              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Socials
                              </span>
                            </th>
                            <th className="px-4 py-3 text-left">
                              <button
                                onClick={() => handleSort("healthScore")}
                                className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                              >
                                Health
                                {sortField === "healthScore" ? (
                                  sortDirection === "asc" ? (
                                    <ChevronUpIcon
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <ChevronDownIcon
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                  )
                                ) : (
                                  <ArrowsUpDownIcon
                                    className="h-3 w-3 opacity-50"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            </th>
                            <th className="hidden px-4 py-3 text-left md:table-cell">
                              <button
                                onClick={() => handleSort("lastAction")}
                                className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                              >
                                Last Action
                                {sortField === "lastAction" ? (
                                  sortDirection === "asc" ? (
                                    <ChevronUpIcon
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <ChevronDownIcon
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                  )
                                ) : (
                                  <ArrowsUpDownIcon
                                    className="h-3 w-3 opacity-50"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <motion.tbody
                          variants={{
                            initial: { opacity: 0 },
                            animate: {
                              opacity: 1,
                              transition: {
                                staggerChildren: 0.04,
                              },
                            },
                          }}
                          initial="initial"
                          animate="animate"
                        >
                          {paginatedProfiles.map((profile) => (
                            <React.Fragment key={profile.id}>
                              <motion.tr
                                variants={{
                                  initial: { opacity: 0, y: 20 },
                                  animate: {
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                      duration: 0.3,
                                      ease: [0.25, 0.46, 0.45, 0.94],
                                    },
                                  },
                                }}
                                onClick={() => handleRowClick(profile.id)}
                                className="cursor-pointer border-b border-border transition-colors hover:bg-muted/50"
                              >
                                <td
                                  className="px-4 py-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.includes(profile.id)}
                                    onChange={() => handleSelectOne(profile.id)}
                                    className="h-4 w-4 rounded border-border"
                                  />
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
                                      style={{
                                        backgroundColor: `hsl(${hashHue(profile.id)}, 70%, 50%)`,
                                      }}
                                    >
                                      {profile.name.startsWith("0x")
                                        ? "W"
                                        : profile.name
                                            .split(" ")
                                            .filter((n) => n.length > 0)
                                            .slice(0, 2)
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(
                                              `/audience/${encodeURIComponent(profile.id)}`
                                            );
                                          }}
                                          className="font-medium text-foreground transition-colors hover:text-accent hover:underline"
                                        >
                                          {profile.name}
                                        </button>
                                        {getStatusIcon(profile.status)}
                                      </div>
                                      <p className="truncate text-sm text-muted-foreground">
                                        {profile.email.length > 0
                                          ? profile.email
                                          : "No email"}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="hidden px-4 py-4 sm:table-cell">
                                  <div className="flex min-w-0 items-center gap-2">
                                    {profile.wallet.length > 0 ? (
                                      <>
                                        {(() => {
                                          const chainMeta = getChainMeta(
                                            profile.chain
                                          );
                                          if (!chainMeta) return null;
                                          return (
                                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                                              <span className="shrink-0">
                                                {chainMeta.icon}
                                              </span>
                                              <span className="max-w-24 truncate">
                                                {chainMeta.name}
                                              </span>
                                            </span>
                                          );
                                        })()}
                                        <code
                                          className="w-24 shrink-0 text-sm text-muted-foreground"
                                          title={profile.walletFull}
                                        >
                                          {profile.wallet}
                                        </code>
                                      </>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        No wallet
                                      </span>
                                    )}
                                    {profile.walletFull?.length > 0 && (
                                      <button
                                        type="button"
                                        className="rounded border border-border bg-card p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard
                                            .writeText(
                                              String(profile.walletFull)
                                            )
                                            .catch(() => undefined);
                                        }}
                                        aria-label="Copy wallet address"
                                      >
                                        <ClipboardDocumentIcon
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="hidden px-4 py-4 md:table-cell">
                                  {(() => {
                                    const socials = extractSocialHandles(
                                      profile.attributes
                                    );
                                    const items: ReactElement[] = [];

                                    if (socials.ens) {
                                      const { ens } = socials;
                                      items.push(
                                        <SocialIconLink
                                          key={`ens:${ens}`}
                                          href={`https://app.ens.domains/name/${encodeURIComponent(ens)}`}
                                          label={`ENS: ${ens}`}
                                        >
                                          <EnsLogo />
                                        </SocialIconLink>
                                      );
                                    }

                                    if (socials.twitter) {
                                      const handle = socials.twitter;
                                      items.push(
                                        <SocialIconLink
                                          key={`x:${handle}`}
                                          href={`https://x.com/${encodeURIComponent(handle)}`}
                                          label={`X: @${handle}`}
                                        >
                                          <XLogo />
                                        </SocialIconLink>
                                      );
                                    }

                                    if (socials.discord) {
                                      const { discord } = socials;
                                      const trimmed = discord.trim();
                                      const isId = /^[0-9]{16,20}$/.test(
                                        trimmed
                                      );
                                      const href = isId
                                        ? `https://discord.com/users/${trimmed}`
                                        : `https://discord.com/users/${encodeURIComponent(trimmed)}`;
                                      items.push(
                                        <SocialIconLink
                                          key={`discord:${trimmed}`}
                                          href={href}
                                          label={`Discord: ${discord}`}
                                        >
                                          <DiscordLogo />
                                        </SocialIconLink>
                                      );
                                    }

                                    if (socials.telegram) {
                                      const handle = socials.telegram;
                                      items.push(
                                        <SocialIconLink
                                          key={`tg:${handle}`}
                                          href={`https://t.me/${encodeURIComponent(handle)}`}
                                          label={`Telegram: @${handle}`}
                                        >
                                          <TelegramLogo />
                                        </SocialIconLink>
                                      );
                                    }

                                    if (items.length === 0) {
                                      return (
                                        <span className="text-sm text-muted-foreground">
                                          —
                                        </span>
                                      );
                                    }

                                    return (
                                      <div className="flex items-center gap-1.5">
                                        {items}
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-2">
                                    {typeof profile.healthScore === "number" ? (
                                      <span
                                        className={`font-medium ${getHealthColor(profile.healthScore)}`}
                                      >
                                        {profile.healthScore}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        Not scored
                                      </span>
                                    )}
                                    <HealthBar
                                      score={
                                        typeof profile.healthScore === "number"
                                          ? profile.healthScore
                                          : null
                                      }
                                    />
                                  </div>
                                </td>
                                <td className="hidden px-4 py-4 md:table-cell">
                                  <div>
                                    <p className="text-sm text-foreground">
                                      {profile.lastAction.label.length > 0
                                        ? profile.lastAction.label
                                        : "No recent activity"}
                                    </p>
                                    {profile.lastAction.time.length > 0 && (
                                      <p className="text-xs text-muted-foreground">
                                        {profile.lastAction.time}
                                      </p>
                                    )}
                                  </div>
                                </td>
                              </motion.tr>
                              <AnimatePresence>
                                {expandedRow === profile.id && (
                                  <motion.tr
                                    variants={{
                                      initial: { opacity: 0, height: 0 },
                                      animate: {
                                        opacity: 1,
                                        height: "auto",
                                        transition: {
                                          duration: 0.3,
                                          ease: [0.25, 0.46, 0.45, 0.94],
                                        },
                                      },
                                      exit: {
                                        opacity: 0,
                                        height: 0,
                                        transition: {
                                          duration: 0.3,
                                          ease: [0.25, 0.46, 0.45, 0.94],
                                        },
                                      },
                                    }}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                  >
                                    <td
                                      colSpan={6}
                                      className="bg-muted/30 px-4 py-4"
                                    >
                                      <div className="mb-3 flex justify-end">
                                        <Link
                                          href={`/audience/${encodeURIComponent(profile.id)}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
                                        >
                                          View full profile
                                          <ChevronRightIcon
                                            className="h-3.5 w-3.5"
                                            aria-hidden="true"
                                          />
                                        </Link>
                                      </div>
                                      <div className="grid gap-4 sm:grid-cols-3">
                                        <div className="rounded-lg border border-border bg-card p-4">
                                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Activity
                                          </h4>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2">
                                              <EyeIcon
                                                className="h-3.5 w-3.5 text-muted-foreground"
                                                aria-hidden="true"
                                              />
                                              <span className="text-foreground">
                                                {profile.lastAction.label
                                                  .length > 0
                                                  ? profile.lastAction.label
                                                  : "No recent activity"}
                                              </span>
                                            </div>
                                            {profile.lastAction.time.length >
                                              0 && (
                                              <div className="text-xs text-muted-foreground">
                                                {profile.lastAction.time}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="rounded-lg border border-border bg-card p-4">
                                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Attributes
                                          </h4>
                                          {Object.keys(profile.attributes)
                                            .length > 0 ? (
                                            <div className="space-y-2">
                                              {Object.entries(
                                                profile.attributes
                                              )
                                                .slice(0, 6)
                                                .map(([k, v]) => (
                                                  <div
                                                    key={k}
                                                    className="flex items-center justify-between gap-3 text-sm"
                                                  >
                                                    <span className="truncate text-muted-foreground">
                                                      {prettifyKey(k)}
                                                    </span>
                                                    <span
                                                      className="truncate font-medium text-foreground"
                                                      title={formatAttributeValue(
                                                        v
                                                      )}
                                                    >
                                                      {formatAttributeValue(v)}
                                                    </span>
                                                  </div>
                                                ))}
                                            </div>
                                          ) : (
                                            <div className="text-sm text-muted-foreground">
                                              No attributes
                                            </div>
                                          )}
                                        </div>
                                        <div className="rounded-lg border border-border bg-card p-4">
                                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Tags
                                          </h4>
                                          <div className="flex flex-wrap gap-2">
                                            {profile.tags.map((tag: string) => (
                                              <span
                                                key={tag}
                                                className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-primary/20"
                                              >
                                                {tag}
                                              </span>
                                            ))}
                                            {profile.engagement.length > 0 && (
                                              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
                                                {profile.engagement} Engagement
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </motion.tr>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          ))}
                        </motion.tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                      <p className="text-sm text-muted-foreground">
                        Showing{" "}
                        {totalItems === 0
                          ? 0
                          : (currentPage - 1) * itemsPerPage + 1}
                        - {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                        {totalItems}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                          aria-label="Previous page"
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed sm:h-9 sm:w-9"
                        >
                          <ChevronLeftIcon
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                                >
                                  {pageNum}
                                </button>
                              );
                            }
                          )}
                        </div>
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          aria-label="Next page"
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed sm:h-9 sm:w-9"
                        >
                          <ChevronRightIcon
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bulk Actions Bar */}
                <AnimatePresence>
                  {selectedIds.length > 0 && (
                    <motion.div
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 100, opacity: 0 }}
                      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
                    >
                      <div className="flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 shadow-xl sm:gap-4 sm:px-6">
                        <span className="text-sm font-medium text-foreground">
                          {selectedIds.length} selected
                        </span>
                        <div className="h-4 w-px bg-border" />
                        <ApplyTagsPopover
                          availableTags={availableTags}
                          isApplying={applyTagsMutation.isPending}
                          onApply={(tags) =>
                            applyTagsMutation.mutateAsync(tags)
                          }
                          trigger={
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                              <TagIcon className="h-4 w-4" aria-hidden="true" />
                              Tag
                            </button>
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setComposeOpen(true)}
                          disabled={emailRecipients.length === 0}
                          title={
                            emailRecipients.length === 0
                              ? "None of the selected profiles have an email channel"
                              : `Send an email to ${emailRecipients.length} recipient${emailRecipients.length === 1 ? "" : "s"}`
                          }
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <EnvelopeIcon
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                          Send email
                        </button>
                        <button
                          onClick={handleBulkExport}
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <ArrowDownTrayIcon
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                          Export
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              disabled={deleteProfilesMutation.isPending}
                              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                            >
                              <TrashIcon
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              {deleteProfilesMutation.isPending
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete selected profiles
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete {selectedIds.length} profile
                                {selectedIds.length === 1 ? "" : "s"}? This
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleBulkDelete}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <div className="h-4 w-px bg-border" />
                        <button
                          onClick={() => setSelectedIds([])}
                          aria-label="Clear selection"
                          className="p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ComposeEmailDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          recipients={emailRecipients}
          skippedCount={selectedIds.length - emailRecipients.length}
          onSent={() => setSelectedIds([])}
        />
      </div>
    </TooltipProvider>
  );
}
