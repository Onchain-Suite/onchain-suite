"use client";

import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  AtSymbolIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  DevicePhoneMobileIcon,
  EllipsisHorizontalIcon,
  EnvelopeIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { cn, isJsonObject } from "@/lib/utils";

import type {
  AudienceExportJobStatus,
  AudienceImportJobStatus,
  AudienceProfile,
  AudienceSegment,
} from "../audience.service";
import { audienceService } from "../audience.service";
import { ApplyTagsPopover } from "../components/apply-tags-popover";
import { AudienceListDetail } from "../components/audience-list-detail";
import { AudienceTagsTab } from "../components/audience-tags-tab";
import {
  ComposeEmailDialog,
  type EmailRecipient,
} from "../components/compose-email-dialog";
import { ContactSlideOver } from "../components/contact-slide-over";
import { SuppressedTab } from "../components/suppressed-tab";
import {
  deriveDisplayName,
  extractSocialHandles,
  extractWalletFields,
  formatRelativeTime,
  formatUsd,
  isAddressLike,
  isSyntheticWalletEmail,
  lifetimeUsd,
  normalizeTags,
  readChannels,
} from "../utils";
import { TableSkeleton } from "@/shared/components/page/page-skeleton";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const ITEMS_PER_PAGE = 10;
const IMPORT_EXPORT_HREF = `${PRIVATE_ROUTES.AUDIENCE}/import-export`;

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

/** The server materializes the suppression list as a system segment; keep it
 *  out of the Lists tab (it belongs only in the Suppressed tab). */
const isSuppressionSegment = (seg: AudienceSegment): boolean => {
  const criteria = isJsonObject(seg.criteria) ? seg.criteria : null;
  if (criteria && typeof criteria.system === "string") {
    return criteria.system.toLowerCase() === "suppressed";
  }
  return seg.name.trim().toLowerCase() === "suppressed emails";
};

interface Row {
  id: string;
  displayName: string;
  hasNamedIdentity: boolean;
  walletFull: string;
  walletShort: string;
  email?: string; // real (non-synthetic) email only
  verified: boolean;
  tags: string[];
  lastActive?: string;
  lifetimeUsd?: number;
  reach: { email: boolean; push: boolean; x: boolean };
}

const toRow = (p: AudienceProfile): Row => {
  const { walletFull, wallet } = extractWalletFields(p);
  const rawEmail = typeof p.email === "string" ? p.email : undefined;
  const email =
    rawEmail && !isSyntheticWalletEmail(rawEmail) ? rawEmail : undefined;
  const socials = extractSocialHandles(p.attributes ?? p);
  // A "named" identity is a real name or ENS - not an email local-part. Wallet
  // contacts without one show the address itself (matching the reference).
  const nameField = typeof p.name === "string" ? p.name.trim() : "";
  const named =
    nameField && !isAddressLike(nameField)
      ? nameField
      : (socials.ens ?? undefined);
  const hasNamedIdentity = Boolean(walletFull) && Boolean(named);
  const displayName = named ?? (walletFull ? wallet : deriveDisplayName(p));
  const verified = p.status === "verified";
  const lastAction =
    p.lastAction && typeof p.lastAction === "object"
      ? (p.lastAction as Record<string, unknown>)
      : undefined;
  const lastActionAt = lastAction?.at ?? lastAction?.time;
  const onchainUsd = lifetimeUsd(p);
  // Prefer the server's real per-channel reachability; fall back to a heuristic
  // only when the API didn't return a `channels` object.
  const channels = readChannels(p);

  return {
    id: p.id,
    displayName,
    hasNamedIdentity,
    walletFull,
    walletShort: wallet,
    email,
    verified,
    tags: normalizeTags(p.tags),
    lastActive:
      typeof lastActionAt === "string" || typeof lastActionAt === "number"
        ? formatRelativeTime(new Date(lastActionAt))
        : undefined,
    lifetimeUsd: onchainUsd ?? undefined,
    reach: channels
      ? {
          email: Boolean(channels.email),
          push: Boolean(channels.inapp),
          x: Boolean(channels.x),
        }
      : {
          // Fallback (no `channels` in the response): ZK-protected (verified
          // wallet) contacts are email-reachable even without a plaintext email;
          // in-app push is inferred from wallet presence.
          email: Boolean(email) || (verified && Boolean(walletFull)),
          push: Boolean(walletFull),
          x: Boolean(socials.twitter),
        },
  };
};

function ReachTile({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground"
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

/**
 * Read a list's display metadata. `type`/`source`/`reachableVia` aren't in the
 * segments API yet (see docs/audience-backend-needs.md §2), so this reads them
 * when present and falls back to sensible defaults.
 */
function listMeta(seg: AudienceSegment): {
  type: "growing" | "static";
  source: string;
  reachable: string[];
} {
  const type: "growing" | "static" =
    seg.type === "static" ? "static" : "growing";
  const sourceObj = isJsonObject(seg.source) ? seg.source : null;
  const source =
    typeof seg.source === "string" && seg.source.trim().length > 0
      ? seg.source
      : sourceObj && typeof sourceObj.label === "string"
        ? sourceObj.label
        : "Manual";
  const reachable = Array.isArray(seg.reachableVia)
    ? seg.reachableVia.filter((r): r is string => typeof r === "string")
    : ["email"];
  return { type, source, reachable };
}

export function AudiencePages() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "contacts" | "lists" | "tags" | "suppressed"
  >("contacts");
  // Deep-link support: `/audience?tab=suppressed` opens that tab (read after
  // mount to avoid a hydration mismatch / Suspense requirement).
  // An import/export started on the import page redirects here with its job id;
  // pick it up so we can show a live progress banner (the job outlives that
  // page's local state).
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importBannerDismissed, setImportBannerDismissed] = useState(false);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportBannerDismissed, setExportBannerDismissed] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "lists" || t === "tags" || t === "suppressed") setActiveTab(t);
    const imp = params.get("import");
    if (imp) setImportJobId(imp);
    const exp = params.get("export");
    if (exp) setExportJobId(exp);
    // Clean the URL so a refresh doesn't re-arm a finished job.
    if (imp || exp) {
      const next = new URLSearchParams(window.location.search);
      next.delete("import");
      next.delete("export");
      const qs = next.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}`
      );
    }
  }, []);

  // Delete-all-contacts confirmation (OWNER/ADMIN; the backend requires the
  // exact current count so it can't fire from a stale tab).
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Inline "New list" form (no modal, per convention).
  const [creatingList, setCreatingList] = useState(false);
  const [listName, setListName] = useState("");
  const [listType, setListType] = useState<"growing" | "static">("growing");
  const [creatingTag, setCreatingTag] = useState(false);
  // A list selected from the Lists table opens its in-page detail.
  const [selectedList, setSelectedList] = useState<AudienceSegment | null>(
    null
  );
  // Rename/delete a list from its row action menu.
  const [renameListTarget, setRenameListTarget] =
    useState<AudienceSegment | null>(null);
  const [renameListValue, setRenameListValue] = useState("");
  const [deleteListTarget, setDeleteListTarget] =
    useState<AudienceSegment | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Clicking a contact opens a slide-in detail panel (not a full-page nav).
  const [selectedProfile, setSelectedProfile] =
    useState<AudienceProfile | null>(null);
  const [slideOpen, setSlideOpen] = useState(false);
  // Wallet-sync job id, set once POST /audience/sync accepts (202) and polled.
  const [syncJobId, setSyncJobId] = useState<string | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["audience", "overview"],
    queryFn: () => audienceService.getOverview(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const profilesQuery = useQuery({
    queryKey: [
      "audience",
      "profiles",
      { page: currentPage, limit: ITEMS_PER_PAGE },
    ],
    queryFn: async () => {
      const res = await audienceService.listProfiles({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        include: "wallets,attributes,tags,lastAction",
      });
      const obj = res as {
        items?: AudienceProfile[];
        data?: AudienceProfile[];
        meta?: unknown;
      };
      const items = Array.isArray(res) ? res : (obj.items ?? obj.data ?? []);
      const meta =
        !Array.isArray(res) && obj.meta && typeof obj.meta === "object"
          ? (obj.meta as Record<string, unknown>)
          : null;
      return { items: items as AudienceProfile[], meta };
    },
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const tagsQuery = useQuery({
    queryKey: ["audience", "tags"],
    queryFn: async () => {
      const res = await audienceService.listTags();
      const items = Array.isArray(res) ? res : (res.items ?? res.data ?? []);
      return items.map((t) => String(t.name)).filter(Boolean);
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const segmentsQuery = useQuery({
    queryKey: ["audience", "segments"],
    queryFn: () => audienceService.listSegments({ limit: 50 }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(
    () => (profilesQuery.data?.items ?? []).map(toRow),
    [profilesQuery.data]
  );

  const meta = profilesQuery.data?.meta;

  const overview = overviewQuery.data;
  // Prefer the meta count, then the overview total, then the visible rows. The
  // page count is derived from whichever total we trust so Prev/Next always
  // appears when there are more contacts than one page - even if the profiles
  // endpoint omits `meta.totalPages`.
  const totalItems =
    num(meta?.totalItems) ?? num(overview?.total) ?? rows.length;
  const totalPages = Math.max(
    1,
    num(meta?.totalPages) ?? Math.ceil(totalItems / ITEMS_PER_PAGE)
  );

  const total = num(overview?.total) ?? totalItems;
  const withWallet = num(overview?.withWallet) ?? 0;
  // Real overview counts. `emailOnly` falls back to the honest arithmetic
  // (total - withWallet); the reachability/suppressed counts come only from the
  // overview endpoint - when absent they render "-", never a fabricated value.
  const emailOnly = num(overview?.emailOnly) ?? Math.max(0, total - withWallet);
  const emailReachable = num(overview?.emailReachable);
  const pushReachable = num(overview?.pushReachable);
  const suppressed = num(overview?.suppressed);

  // Live progress for an import that redirected here. Polls while the job is
  // queued/processing, then stops; refreshes the audience on completion.
  const importStatusQuery = useQuery({
    queryKey: ["audience", "import-status", importJobId],
    queryFn: () => audienceService.getImportJob(importJobId as string),
    enabled: Boolean(importJobId) && !importBannerDismissed,
    refetchInterval: (query) => {
      const s = query.state.data?.state;
      return s === "queued" || s === "processing" ? 1500 : false;
    },
    retry: false,
  });
  const importStatus = importStatusQuery.data;
  useEffect(() => {
    if (importStatus?.state === "completed") {
      queryClient.invalidateQueries({ queryKey: ["audience"] });
    }
  }, [importStatus?.state, queryClient]);

  // Live progress for an export that redirected here; polls until the file is
  // ready, then the banner offers a download.
  const exportStatusQuery = useQuery({
    queryKey: ["audience", "export-status", exportJobId],
    queryFn: () => audienceService.getExportJob(exportJobId as string),
    enabled: Boolean(exportJobId) && !exportBannerDismissed,
    refetchInterval: (query) => {
      const s = query.state.data?.state;
      return s === "queued" || s === "processing" ? 1500 : false;
    },
    retry: false,
  });
  const exportStatus = exportStatusQuery.data;

  const downloadExportMutation = useMutation({
    mutationFn: async () => {
      if (!exportJobId) return;
      const blob = await audienceService.downloadExport(exportJobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audience-export.${exportStatus?.format ?? "csv"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: () =>
      toast.error("We couldn't download the file. Please try again."),
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => audienceService.deleteAllProfiles(total),
    onSuccess: (res) => {
      setDeleteAllOpen(false);
      setDeleteConfirmText("");
      toast.success(`Deleted ${res?.deleted ?? total} contacts.`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["audience"] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "";
      if (/CONTACT_COUNT_MISMATCH/i.test(msg)) {
        queryClient.invalidateQueries({ queryKey: ["audience", "overview"] });
        setDeleteAllOpen(false);
        setDeleteConfirmText("");
        toast.error(
          "Your contact count just changed. We've refreshed it - reopen the dialog to confirm the new number."
        );
        return;
      }
      if (/\b40[13]\b|FORBIDDEN|permission/i.test(msg)) {
        toast.error(
          "Only workspace owners and admins can delete all contacts."
        );
        return;
      }
      if (/\b404\b|not found/i.test(msg)) {
        toast.error(
          "Bulk delete isn't available on the connected API yet. Update the backend, then try again."
        );
        return;
      }
      toast.error("We couldn't delete the contacts. Please try again.");
    },
  });

  // The suppression list is materialized server-side as a system segment + a
  // `suppressed-email` tag. It lives in the Suppressed tab only - keep it out of
  // the Lists and Tags tabs.
  const availableTags = useMemo(
    () =>
      (tagsQuery.data ?? []).filter(
        (t) => t.toLowerCase() !== "suppressed-email"
      ),
    [tagsQuery.data]
  );
  const segments = useMemo(
    () => (segmentsQuery.data ?? []).filter((s) => !isSuppressionSegment(s)),
    [segmentsQuery.data]
  );

  const emailRecipients: EmailRecipient[] = useMemo(
    () =>
      rows
        .filter((r) => selectedIds.includes(r.id) && r.email)
        .map((r) => ({
          id: r.id,
          name: r.displayName,
          email: r.email as string,
        })),
    [rows, selectedIds]
  );

  // Reset selection + transient views when the tab changes.
  useEffect(() => {
    setSelectedIds([]);
    setSelectedList(null);
    setCreatingTag(false);
  }, [activeTab]);

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => audienceService.deleteProfile(id)));
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["audience", "profiles"] });
      queryClient.invalidateQueries({ queryKey: ["audience", "overview"] });
    },
  });

  const applyTagsMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      const existing = new Set(availableTags);
      await Promise.all(
        tags
          .filter((t) => !existing.has(t))
          .map((t) => audienceService.createTag({ name: t }).catch(() => null))
      );
      await Promise.all(
        selectedIds.map((id) =>
          audienceService.addTagsToProfile(id, { tags }).catch(() => null)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience", "profiles"] });
      queryClient.invalidateQueries({ queryKey: ["audience", "tags"] });
    },
  });

  const createListMutation = useMutation({
    mutationFn: (input: { name: string; type: "growing" | "static" }) =>
      audienceService.createSegment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience", "segments"] });
      setCreatingList(false);
      setListName("");
      setListType("growing");
    },
  });

  const renameListMutation = useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      audienceService.renameSegment(input.id, input.name),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["audience", "segments"] });
      // Keep an open detail view in sync with the new name.
      setSelectedList((prev) =>
        prev?.id === updated.id ? { ...prev, ...updated } : prev
      );
      setRenameListTarget(null);
      setRenameListValue("");
      toast.success("List renamed");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't rename list"),
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: string) => audienceService.deleteSegment(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: ["audience", "segments"] });
      setSelectedList((prev) => (prev?.id === id ? null : prev));
      setDeleteListTarget(null);
      const kept = num(res?.contactsKept);
      toast.success(
        typeof kept === "number"
          ? `List deleted. ${kept.toLocaleString()} contact${
              kept === 1 ? "" : "s"
            } kept in your audience.`
          : "List deleted. Your contacts were kept."
      );
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't delete list"),
  });

  // "Sync wallets": enqueue (202) then poll GET /audience/sync for progress.
  const syncMutation = useMutation({
    mutationFn: () => audienceService.syncWallets(),
    onSuccess: (res) => {
      const jobId = typeof res?.jobId === "string" ? res.jobId : null;
      setSyncJobId(jobId);
      toast.success("Wallet sync started - refreshing your audience.");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to start sync"),
  });

  const syncStatusQuery = useQuery({
    queryKey: ["audience", "sync", syncJobId],
    enabled: Boolean(syncJobId),
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () => audienceService.getSyncStatus(syncJobId ?? undefined),
    refetchInterval: (q) => {
      const state = String(
        (q.state.data as { state?: string } | undefined)?.state ?? ""
      );
      return state === "completed" || state === "failed" ? false : 1500;
    },
  });

  const syncState = String(syncStatusQuery.data?.state ?? "");
  const syncProgress = Math.max(
    0,
    Math.min(100, Math.round(num(syncStatusQuery.data?.progress) ?? 0))
  );
  const syncing =
    Boolean(syncJobId) && syncState !== "completed" && syncState !== "failed";

  // When the sync finishes, refresh the audience data and clear the job.
  useEffect(() => {
    if (!syncJobId) return;
    if (syncState === "completed") {
      queryClient.invalidateQueries({ queryKey: ["audience", "profiles"] });
      queryClient.invalidateQueries({ queryKey: ["audience", "overview"] });
      queryClient.invalidateQueries({ queryKey: ["audience", "segments"] });
      toast.success("Wallet sync complete.");
      setSyncJobId(null);
    } else if (syncState === "failed") {
      toast.error("Wallet sync failed. Try again.");
      setSyncJobId(null);
    }
  }, [syncJobId, syncState, queryClient]);

  // Apply tags to a single profile (from the slide-in panel).
  const slideTagMutation = useMutation({
    mutationFn: async (input: { profileId: string; tags: string[] }) => {
      const existing = new Set(availableTags);
      await Promise.all(
        input.tags
          .filter((t) => !existing.has(t))
          .map((t) => audienceService.createTag({ name: t }).catch(() => null))
      );
      await audienceService
        .addTagsToProfile(input.profileId, { tags: input.tags })
        .catch(() => null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience", "profiles"] });
      queryClient.invalidateQueries({ queryKey: ["audience", "tags"] });
    },
  });

  // The current page's profiles, addressable by id so a row click can hand the
  // full profile to the slide-in without another fetch.
  const profileById = useMemo(() => {
    const map = new Map<string, AudienceProfile>();
    for (const p of profilesQuery.data?.items ?? []) map.set(p.id, p);
    return map;
  }, [profilesQuery.data]);

  const openContact = (id: string) => {
    const profile = profileById.get(id);
    if (!profile) return;
    setSelectedProfile(profile);
    setSlideOpen(true);
  };

  const sendTestFromSlide = (profile: AudienceProfile) => {
    setSelectedIds([profile.id]);
    setSlideOpen(false);
    setComposeOpen(true);
  };

  // Add a single contact to a list/segment from the slide-in panel.
  const addToSegmentMutation = useMutation({
    mutationFn: (input: { segmentId: string; profileId: string }) =>
      audienceService.addSegmentMembers(input.segmentId, [input.profileId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience", "segments"] });
      toast.success("Added to list.");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to add to list"),
  });

  const toggleOne = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const copyWallet = (row: Row) => {
    if (!row.walletFull) return;
    navigator.clipboard?.writeText(row.walletFull).then(
      () => {
        setCopiedId(row.id);
        window.setTimeout(() => setCopiedId(null), 1200);
      },
      () => undefined
    );
  };

  const statCards: Array<{
    label: string;
    value: number | undefined;
    hint: string;
  }> = [
    {
      label: "Total contacts",
      value: total,
      hint: `${withWallet.toLocaleString()} with a wallet · ${emailOnly.toLocaleString()} email-only`,
    },
    {
      label: "Email-reachable",
      value: emailReachable,
      hint: "have a linked email",
    },
    {
      label: "Push-reachable",
      value: pushReachable,
      hint: "signed-in devices",
    },
    { label: "Suppressed", value: suppressed, hint: "unsubscribed or bounced" },
  ];

  const tabs: Array<{
    key: "contacts" | "lists" | "tags" | "suppressed";
    label: string;
    count: number | string;
  }> = [
    { key: "contacts", label: "Contacts", count: total },
    { key: "lists", label: "Lists", count: segments.length },
    { key: "tags", label: "Tags", count: availableTags.length },
    { key: "suppressed", label: "Suppressed", count: suppressed ?? "-" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {importJobId && importStatus && !importBannerDismissed ? (
        <ImportProgressBanner
          status={importStatus}
          onDismiss={() => setImportBannerDismissed(true)}
        />
      ) : null}
      {exportJobId && exportStatus && !exportBannerDismissed ? (
        <ExportProgressBanner
          status={exportStatus}
          downloading={downloadExportMutation.isPending}
          onDownload={() => downloadExportMutation.mutate()}
          onDismiss={() => setExportBannerDismissed(true)}
        />
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Audience
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Wallet-first identity. Segments are channel-aware - reachable in-app
            is a different filter from has email.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={IMPORT_EXPORT_HREF}>
              <ArrowUpTrayIcon className="mr-2 size-4" aria-hidden="true" />
              Import CSV
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={IMPORT_EXPORT_HREF}>
              <ArrowDownTrayIcon className="mr-2 size-4" aria-hidden="true" />
              Export
            </Link>
          </Button>
          <Button
            className="rounded-xl"
            disabled={syncMutation.isPending || syncing}
            onClick={() => syncMutation.mutate()}
            title="Pulls holders from your indexed contracts into the audience. This adds new wallets. To refresh metrics on wallets you already have, use Enrich in Intelligence."
          >
            <ArrowPathIcon
              className={cn("mr-2 size-4", syncing && "animate-spin")}
              aria-hidden="true"
            />
            {syncing
              ? syncProgress > 0
                ? `Syncing ${syncProgress}%`
                : "Syncing…"
              : "Sync wallets"}
          </Button>
          {activeTab === "contacts" && total > 0 ? (
            <Button
              variant="outline"
              className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setDeleteConfirmText("");
                setDeleteAllOpen(true);
              }}
            >
              <TrashIcon className="mr-2 size-4" aria-hidden="true" />
              Delete all
            </Button>
          ) : null}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            {typeof card.value === "number" ? (
              <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                {card.value.toLocaleString()}
              </p>
            ) : overviewQuery.isLoading ? (
              <Skeleton className="mt-2 h-8 w-24" aria-hidden="true" />
            ) : (
              // Overview errored or omitted this count - show an honest "-",
              // never a fabricated fallback.
              <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                -
              </p>
            )}
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {card.hint}
            </p>
          </div>
        ))}
      </section>

      {selectedList ? (
        <AudienceListDetail
          segment={selectedList}
          onBack={() => setSelectedList(null)}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Audience segments"
              className="flex flex-wrap items-center gap-2"
            >
              {tabs.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        "ml-1.5 tabular-nums",
                        active ? "text-primary" : "text-muted-foreground/70"
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
            {activeTab === "lists" && !creatingList ? (
              <Button size="sm" onClick={() => setCreatingList(true)}>
                <PlusIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
                New list
              </Button>
            ) : activeTab === "tags" && !creatingTag ? (
              <Button size="sm" onClick={() => setCreatingTag(true)}>
                <PlusIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
                New tag
              </Button>
            ) : null}
          </div>

          {activeTab === "contacts" ? (
            <div className="space-y-3">
              {selectedIds.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
                  <span className="text-sm font-medium">
                    {selectedIds.length} selected
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      disabled={emailRecipients.length === 0}
                      onClick={() => setComposeOpen(true)}
                    >
                      <EnvelopeIcon
                        className="mr-1.5 size-4"
                        aria-hidden="true"
                      />
                      Compose
                    </Button>
                    <ApplyTagsPopover
                      availableTags={availableTags}
                      isApplying={applyTagsMutation.isPending}
                      onApply={(tags) => applyTagsMutation.mutateAsync(tags)}
                      trigger={
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                        >
                          Tag
                        </Button>
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(selectedIds)}
                    >
                      <TrashIcon className="mr-1.5 size-4" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </div>
              ) : null}

              {profilesQuery.isLoading ? (
                <TableSkeleton rows={8} />
              ) : profilesQuery.isError ? (
                <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
                  Failed to load contacts.
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                  No contacts yet - import a CSV or sync a contract to get
                  started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                        <th className="py-3 pr-4 font-medium">Contact</th>
                        <th className="px-4 py-3 font-medium">Reachable via</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Tags</th>
                        <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                          Lifetime
                        </th>
                        <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                          Last active
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const selected = selectedIds.includes(row.id);
                        const lifetime =
                          typeof row.lifetimeUsd === "number"
                            ? formatUsd(row.lifetimeUsd)
                            : "-";
                        return (
                          <tr
                            key={row.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => openContact(row.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") openContact(row.id);
                            }}
                            className={cn(
                              "group/row cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
                              selected && "bg-primary/[0.04]"
                            )}
                          >
                            <td className="py-3.5 pr-4">
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleOne(row.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`Select ${row.displayName}`}
                                  className={cn(
                                    "size-4 shrink-0 cursor-pointer rounded border-border accent-primary transition-opacity",
                                    selected
                                      ? "opacity-100"
                                      : "opacity-0 group-hover/row:opacity-100"
                                  )}
                                />
                                <span className="flex min-w-0 items-center gap-2 text-left">
                                  {row.hasNamedIdentity ? (
                                    <>
                                      <span className="font-medium text-foreground">
                                        {row.displayName}
                                      </span>
                                      <span className="font-mono text-xs text-muted-foreground">
                                        {row.walletShort}
                                      </span>
                                    </>
                                  ) : row.walletFull ? (
                                    <span className="font-mono text-foreground">
                                      {row.walletShort}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                      <EnvelopeIcon
                                        className="size-4"
                                        aria-hidden="true"
                                      />
                                      No wallet
                                    </span>
                                  )}
                                </span>
                                {row.walletFull ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyWallet(row);
                                    }}
                                    aria-label="Copy wallet address"
                                    className="text-muted-foreground transition-colors hover:text-foreground"
                                  >
                                    {copiedId === row.id ? (
                                      <CheckIcon className="size-3.5" />
                                    ) : (
                                      <ClipboardDocumentIcon className="size-3.5" />
                                    )}
                                  </button>
                                ) : null}
                                {row.walletFull && row.verified ? (
                                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                    ZK
                                  </span>
                                ) : !row.walletFull ? (
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    Email only
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                {row.reach.email ? (
                                  <ReachTile>
                                    <EnvelopeIcon className="size-4" />
                                  </ReachTile>
                                ) : null}
                                {row.reach.push ? (
                                  <ReachTile>
                                    <DevicePhoneMobileIcon className="size-4" />
                                  </ReachTile>
                                ) : null}
                                {row.reach.x ? (
                                  <ReachTile>
                                    <AtSymbolIcon className="size-4" />
                                  </ReachTile>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {row.email ? (
                                <span
                                  className="block max-w-[240px] truncate font-mono text-xs text-foreground"
                                  title={row.email}
                                >
                                  {row.email}
                                </span>
                              ) : row.walletFull && row.verified ? (
                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                  <ShieldCheckIcon
                                    className="size-4 text-primary"
                                    aria-hidden="true"
                                  />
                                  ZK-protected
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              {row.tags.length > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  {row.tags.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {row.tags.length > 2 ? (
                                    <span className="text-xs text-muted-foreground">
                                      +{row.tags.length - 2}
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right tabular-nums text-foreground">
                              {lifetime}
                            </td>
                            <td className="px-4 py-3.5 text-right whitespace-nowrap text-muted-foreground">
                              {row.lastActive ?? "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 ? (
                <div className="flex items-center justify-between pt-1 text-sm text-muted-foreground">
                  <span>
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of{" "}
                    {totalItems.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : activeTab === "lists" ? (
            <div className="space-y-4">
              {/* Inline New-list form - no modal. */}
              {creatingList ? (
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <p className="text-sm font-semibold text-foreground">
                    New list
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="new-list-name"
                        className="text-sm font-medium text-foreground"
                      >
                        Name
                      </label>
                      <Input
                        id="new-list-name"
                        autoFocus
                        value={listName}
                        onChange={(e) => setListName(e.target.value)}
                        placeholder="e.g. Newsletter subscribers"
                        className="h-10 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="new-list-type"
                        className="text-sm font-medium text-foreground"
                      >
                        Type
                      </label>
                      <Select
                        value={listType}
                        onValueChange={(v) =>
                          setListType(v as "growing" | "static")
                        }
                      >
                        <SelectTrigger
                          id="new-list-type"
                          className="h-10 w-full rounded-lg"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="growing">
                            Growing - keeps gaining members
                          </SelectItem>
                          <SelectItem value="static">
                            Static - a fixed set
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Growing lists keep gaining members from forms and rules.
                    Static lists are a fixed set.
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={createListMutation.isPending}
                      onClick={() => {
                        setCreatingList(false);
                        setListName("");
                        setListType("growing");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={createListMutation.isPending}
                      onClick={() => {
                        const name = listName.trim();
                        if (name.length === 0) {
                          toast.error("Name your list.");
                          return;
                        }
                        createListMutation.mutate({ name, type: listType });
                      }}
                    >
                      {createListMutation.isPending
                        ? "Creating…"
                        : "Create list"}
                    </Button>
                  </div>
                </div>
              ) : null}

              {segments.length === 0 && !creatingList ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                  No lists yet - create one, or save a segment to reuse it
                  across campaigns.
                </div>
              ) : segments.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-5 py-3 font-medium">List</th>
                        <th className="px-4 py-3 font-medium">Source</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Reachable via</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Contacts
                        </th>
                        <th className="px-4 py-3 font-medium">Updated</th>
                        <th className="w-8 py-3" aria-hidden="true" />
                      </tr>
                    </thead>
                    <tbody>
                      {segments.map((seg) => {
                        const meta = listMeta(seg);
                        return (
                          <tr
                            key={seg.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedList(seg)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setSelectedList(seg);
                            }}
                            className="cursor-pointer border-b border-border outline-none last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40"
                          >
                            <td className="px-5 py-4 font-medium text-foreground">
                              {seg.name}
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">
                              {meta.source}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
                                  meta.type === "growing"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                <span
                                  className={cn(
                                    "size-1.5 rounded-full",
                                    meta.type === "growing"
                                      ? "bg-emerald-500"
                                      : "bg-muted-foreground"
                                  )}
                                />
                                {meta.type === "growing" ? "Growing" : "Static"}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                {meta.reachable.includes("email") ? (
                                  <EnvelopeIcon
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                ) : null}
                                {meta.reachable.includes("push") ? (
                                  <DevicePhoneMobileIcon
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                ) : null}
                                {meta.reachable.length === 0 ? "-" : null}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums text-foreground">
                              {typeof seg.count === "number"
                                ? seg.count.toLocaleString()
                                : "-"}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                              {seg.updatedAt
                                ? formatRelativeTime(seg.updatedAt)
                                : "-"}
                            </td>
                            <td className="py-4 pr-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`Actions for ${seg.name}`}
                                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
                                  >
                                    <EllipsisHorizontalIcon
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setRenameListTarget(seg);
                                      setRenameListValue(seg.name);
                                    }}
                                  >
                                    <PencilSquareIcon
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setDeleteListTarget(seg);
                                    }}
                                  >
                                    <TrashIcon
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : activeTab === "tags" ? (
            <AudienceTagsTab
              tags={availableTags}
              creating={creatingTag}
              onCancelCreate={() => setCreatingTag(false)}
            />
          ) : (
            <SuppressedTab />
          )}
        </>
      )}

      <ContactSlideOver
        profile={selectedProfile}
        open={slideOpen}
        onOpenChange={setSlideOpen}
        availableTags={availableTags}
        applyingTags={slideTagMutation.isPending}
        onApplyTags={(profileId, tags) =>
          slideTagMutation.mutateAsync({ profileId, tags })
        }
        onCompose={sendTestFromSlide}
        segments={segments}
        addingToSegment={addToSegmentMutation.isPending}
        onAddToSegment={(segmentId, profileId) =>
          addToSegmentMutation.mutate({ segmentId, profileId })
        }
      />

      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        recipients={emailRecipients}
        skippedCount={selectedIds.length - emailRecipients.length}
        onSent={() => setSelectedIds([])}
      />

      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Delete all {total.toLocaleString()} contacts?
            </DialogTitle>
            <DialogDescription>
              This permanently removes every contact in this workspace, along
              with their tags and list memberships. It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label
              htmlFor="delete-all-confirm"
              className="text-xs font-medium text-muted-foreground"
            >
              Type <span className="font-semibold text-foreground">DELETE</span>{" "}
              to confirm
            </label>
            <Input
              id="delete-all-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteAllOpen(false)}
              disabled={deleteAllMutation.isPending}
            >
              Keep my contacts
            </Button>
            <Button
              variant="destructive"
              disabled={
                deleteConfirmText.trim() !== "DELETE" ||
                deleteAllMutation.isPending ||
                total <= 0
              }
              onClick={() => deleteAllMutation.mutate()}
            >
              {deleteAllMutation.isPending
                ? "Deleting…"
                : `Delete ${total.toLocaleString()} contacts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename a list. */}
      <Dialog
        open={renameListTarget !== null}
        onOpenChange={(open) => {
          if (!open && !renameListMutation.isPending) {
            setRenameListTarget(null);
            setRenameListValue("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename list</DialogTitle>
            <DialogDescription>
              This renames the saved view. Its contacts and the tag behind it
              are untouched.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label
              htmlFor="rename-list-name"
              className="text-sm font-medium text-foreground"
            >
              Name
            </label>
            <Input
              id="rename-list-name"
              autoFocus
              value={renameListValue}
              onChange={(e) => setRenameListValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameListTarget) {
                  const next = renameListValue.trim();
                  if (next && next !== renameListTarget.name) {
                    renameListMutation.mutate({
                      id: renameListTarget.id,
                      name: next,
                    });
                  }
                }
              }}
              className="h-10 rounded-lg"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={renameListMutation.isPending}
              onClick={() => {
                setRenameListTarget(null);
                setRenameListValue("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                renameListMutation.isPending ||
                renameListValue.trim().length === 0 ||
                renameListValue.trim() === renameListTarget?.name
              }
              onClick={() => {
                if (!renameListTarget) return;
                const next = renameListValue.trim();
                if (!next) return;
                renameListMutation.mutate({
                  id: renameListTarget.id,
                  name: next,
                });
              }}
            >
              {renameListMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete a list (saved view only - contacts stay in the audience). */}
      <AlertDialog
        open={deleteListTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteListMutation.isPending) {
            setDeleteListTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this list?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved view “{deleteListTarget?.name}”.{" "}
              {typeof deleteListTarget?.count === "number"
                ? `The ${deleteListTarget.count.toLocaleString()} contact${
                    deleteListTarget.count === 1 ? "" : "s"
                  } in it stay in your audience.`
                : "The contacts in it stay in your audience."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteListMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteListMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteListTarget) {
                  deleteListMutation.mutate(deleteListTarget.id);
                }
              }}
            >
              {deleteListMutation.isPending ? "Deleting…" : "Delete list"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Live progress banner for an import that redirected to the audience page. */
function ImportProgressBanner({
  status,
  onDismiss,
}: {
  status: AudienceImportJobStatus;
  onDismiss: () => void;
}) {
  const state = String(status.state ?? "queued");
  const done = state === "completed";
  const failed = state === "failed" || state === "cancelled";
  const queued = state === "queued";
  const pct = Math.min(
    100,
    Math.max(0, Math.round(Number(status.progress ?? 0)))
  );
  const processed = Number(status.processedRows ?? 0);
  const totalRows = Number(status.totalRows ?? 0);

  // Completion summary: the counts that keep this banner honest. `warnings`
  // (rows imported without a usable wallet) and `quarantinedCount` (rows held
  // over the plan cap) are NOT errors, but they are also not what the customer
  // expects - so surface them next to created/updated/skipped/errors.
  const warningCount = status.warnings?.length ?? 0;
  const quarantined =
    typeof status.quarantinedCount === "number"
      ? status.quarantinedCount
      : null;
  const errorCount = Number(status.errorCount ?? 0);
  // The import-time email verifier suppresses undeliverable addresses. `bad` =
  // newly suppressed this import; `suppressed` = already on the suppression list
  // before it. Both mean the row landed but is NOT email-reachable - the single
  // most important thing to surface, since an all-suppressed import otherwise
  // reads as a clean success while nobody is actually mailable.
  const suppressedBad = Number(status.verification?.bad ?? 0);
  const alreadySuppressed = Number(status.verification?.suppressed ?? 0);
  const doneParts = [
    `${Number(status.createdCount ?? 0).toLocaleString()} imported`,
    `${Number(status.updatedCount ?? 0).toLocaleString()} updated`,
    `${Number(status.skippedCount ?? 0).toLocaleString()} skipped`,
  ];
  if (errorCount > 0) {
    doneParts.push(`${errorCount.toLocaleString()} errors`);
  }
  if (suppressedBad > 0) {
    doneParts.push(
      `${suppressedBad.toLocaleString()} suppressed (undeliverable)`
    );
  }
  if (alreadySuppressed > 0) {
    doneParts.push(`${alreadySuppressed.toLocaleString()} already suppressed`);
  }
  if (warningCount > 0) {
    doneParts.push(`${warningCount.toLocaleString()} without a wallet`);
  }
  if (quarantined && quarantined > 0) {
    doneParts.push(`${quarantined.toLocaleString()} awaiting capacity`);
  }
  // ORPHANED and other terminal failures carry a customer-facing sentence in
  // errorSample[0].message - render it verbatim.
  const failureMessage =
    status.errorSample?.[0]?.message ??
    "Some rows couldn't be imported. Open Import to download the error report.";
  // A job that suppressed / quarantined / dropped-wallet rows landed, but not
  // cleanly - reflect that so the banner never reads as a clean success when
  // none of the imported contacts are actually reachable.
  const doneWithNotes =
    done &&
    (warningCount > 0 ||
      (quarantined ?? 0) > 0 ||
      suppressedBad > 0 ||
      alreadySuppressed > 0);

  const tone = failed
    ? "border-destructive/30 bg-destructive/5"
    : doneWithNotes
      ? "border-amber-500/30 bg-amber-500/5"
      : done
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-primary/30 bg-primary/5";

  return (
    <div className={cn("rounded-2xl border p-4", tone)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {done
              ? doneWithNotes
                ? "Import complete, with items to review"
                : "Import complete"
              : failed
                ? "Import didn't finish"
                : queued
                  ? "Import queued…"
                  : "Importing your contacts…"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {done
              ? `${doneParts.join(" · ")}.`
              : failed
                ? failureMessage
                : queued
                  ? "Queued on the import worker - large files can take a few minutes. This keeps running if you leave."
                  : totalRows > 0
                    ? `${processed.toLocaleString()} of ${totalRows.toLocaleString()} rows`
                    : "Starting up…"}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
      {!done && !failed ? (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Live progress banner for an export that redirected here; offers the download
 *  once the file is ready. */
function ExportProgressBanner({
  status,
  downloading,
  onDownload,
  onDismiss,
}: {
  status: AudienceExportJobStatus;
  downloading: boolean;
  onDownload: () => void;
  onDismiss: () => void;
}) {
  const state = String(status.state ?? "queued");
  const done = state === "completed";
  const failed = state === "failed" || state === "cancelled";
  const pct = Math.min(
    100,
    Math.max(0, Math.round(Number(status.progress ?? 0)))
  );
  const tone = failed
    ? "border-destructive/30 bg-destructive/5"
    : done
      ? "border-emerald-500/30 bg-emerald-500/5"
      : "border-primary/30 bg-primary/5";

  return (
    <div className={cn("rounded-2xl border p-4", tone)}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {done
              ? "Your export is ready"
              : failed
                ? "Export didn't finish"
                : "Preparing your export…"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {done
              ? "Download the file below - the link expires after a while."
              : failed
                ? "Please try the export again."
                : "This runs in the background - you can keep working."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {done ? (
            <Button size="sm" onClick={onDownload} disabled={downloading}>
              <ArrowDownTrayIcon className="mr-2 size-4" aria-hidden="true" />
              {downloading ? "Downloading…" : "Download"}
            </Button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      </div>
      {!done && !failed ? (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
