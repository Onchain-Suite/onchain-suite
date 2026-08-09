"use client";

import {
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  CubeIcon,
  CursorArrowRaysIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  EyeIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TagIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ChainLogo } from "@/components/common/chain-logo";
import { CopyButton } from "@/components/common/copy-button";

import { isJsonObject } from "@/lib/utils";

import {
  type AudienceProfile,
  type AudienceProfileActivityEvent,
  type AudienceProfileContractActivity,
  type AudienceProfileEmailEvent,
  type AudienceProfileTransaction,
  audienceService,
} from "@/features/audience/audience.service";
import { ApplyTagsPopover } from "@/features/audience/components/apply-tags-popover";
import { ComposeEmailDialog } from "@/features/audience/components/compose-email-dialog";
import {
  deriveDisplayName,
  extractWalletFields,
  formatAttributeValue,
  formatDateTime,
  formatRelativeTime,
  hashHue,
  isAddressLike,
  isSyntheticWalletEmail,
  normalizeTags,
  prettifyKey,
  shortenWallet,
} from "@/features/audience/utils";

const formatUsd = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value)}`;
  }
};

const activityIconForType = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes("open")) return EyeIcon;
  if (t.includes("click")) return CursorArrowRaysIcon;
  if (t.includes("tx") || t.includes("swap") || t.includes("stake"))
    return CubeIcon;
  if (t.includes("tag")) return TagIcon;
  if (t.includes("profile")) return CheckCircleIcon;
  return ArrowsRightLeftIcon;
};

const RegionHeading = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="mb-4">
    <h2 className="text-sm font-medium text-foreground">{title}</h2>
    <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
  </div>
);

export function ProfileDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const queryClient = useQueryClient();
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "activity" | "attributes" | "emails" | "transactions"
  >("activity");

  const hasId = id.length > 0;

  const profileQuery = useQuery({
    queryKey: [
      "audience",
      "profile",
      id,
      { include: "tags,attributes,wallets,health,lastAction" },
    ],
    queryFn: () =>
      audienceService.getProfile(id, {
        include: "tags,attributes,wallets,health,lastAction",
      }) as unknown as Promise<AudienceProfile>,
    enabled: hasId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const churnQuery = useQuery({
    queryKey: ["audience", "profile", id, "churn"],
    queryFn: () => audienceService.getProfileChurn(id),
    enabled: hasId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const contractActivityQuery = useQuery({
    queryKey: ["audience", "profile", id, "contract-activity", { limit: 10 }],
    queryFn: () =>
      audienceService.getProfileContractActivity(id, { limit: 10 }),
    enabled: hasId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const dappStatsQuery = useQuery({
    queryKey: ["audience", "profile", id, "dapp-stats"],
    queryFn: () => audienceService.getProfileDappStats(id),
    enabled: hasId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const emailsQuery = useQuery({
    queryKey: ["audience", "profile", id, "emails", { limit: 50 }],
    queryFn: () => audienceService.getProfileEmails(id, { limit: 50 }),
    enabled: hasId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const transactionsQuery = useQuery({
    queryKey: ["audience", "profile", id, "transactions", { limit: 25 }],
    queryFn: () => audienceService.getProfileTransactions(id, { limit: 25 }),
    enabled: hasId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const activityQuery = useQuery({
    queryKey: ["audience", "profile", id, "activity", { limit: 50 }],
    queryFn: () => audienceService.getProfileActivity(id, { limit: 50 }),
    enabled: hasId && activeTab === "activity",
    retry: false,
    refetchOnWindowFocus: false,
  });

  const profile = profileQuery.data;
  const tags = useMemo(() => normalizeTags(profile?.tags), [profile?.tags]);
  const { walletFull, wallet } = useMemo(
    () => extractWalletFields(profile),
    [profile]
  );

  const tagsQuery = useQuery({
    queryKey: ["audience", "tags"],
    queryFn: async () => {
      const res = await audienceService.listTags();
      const rows: unknown[] = Array.isArray(res)
        ? res
        : ((res as { items?: unknown[]; data?: unknown[] }).items ??
          (res as { data?: unknown[] }).data ??
          []);
      return rows
        .map((row) =>
          isJsonObject(row) && typeof row.name === "string" ? row.name : ""
        )
        .filter((n) => n.length > 0);
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const availableTags = tagsQuery.data ?? [];

  const invalidateProfile = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["audience", "profile", id],
      }),
      queryClient.invalidateQueries({ queryKey: ["audience", "tags"] }),
    ]);

  const addTagsMutation = useMutation({
    mutationFn: async (nextTags: string[]) => {
      const cleaned = Array.from(
        new Set(nextTags.map((t) => t.trim()).filter((t) => t.length > 0))
      );
      if (cleaned.length === 0) return;
      const known = new Set(availableTags.map((t) => t.toLowerCase()));
      await Promise.all(
        cleaned
          .filter((t) => !known.has(t.toLowerCase()))
          .map((n) =>
            audienceService.createTag({ name: n }).catch(() => undefined)
          )
      );
      await audienceService.addTagsToProfile(id, { tags: cleaned });
    },
    onSuccess: async () => {
      await invalidateProfile();
      toast.success("Tags added");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to add tags"),
  });

  const removeTagMutation = useMutation({
    mutationFn: (tag: string) => audienceService.removeTagFromProfile(id, tag),
    onSuccess: async () => {
      await invalidateProfile();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to remove tag"),
  });

  const email = typeof profile?.email === "string" ? profile.email.trim() : "";
  // Wallet-only contacts carry a synthetic placeholder email - treat them as
  // having no email channel (channel-aware reachability, wallet-first).
  const hasEmailChannel = email.length > 0 && !isSyntheticWalletEmail(email);
  const name = useMemo(() => {
    return deriveDisplayName({
      name: profile?.name,
      fullName: (profile as unknown as { fullName?: unknown })?.fullName,
      email,
      wallet: walletFull,
      walletAddress: walletFull,
    });
  }, [email, profile, walletFull]);

  const status = typeof profile?.status === "string" ? profile.status : "";

  const intelligenceSegments = useMemo(() => {
    const attr = isJsonObject(profile?.attributes) ? profile?.attributes : {};
    const direct = (profile as unknown as { intelligenceSegments?: unknown })
      ?.intelligenceSegments;
    const pick = (v: unknown) =>
      Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
    const fromDirect = pick(direct);
    const fromAttr = pick(
      isJsonObject(attr)
        ? (attr as Record<string, unknown>).intelligenceSegments
        : undefined
    );
    return (fromDirect.length ? fromDirect : fromAttr) as string[];
  }, [profile]);

  const profileAttributes = useMemo(() => {
    const attrs = isJsonObject(profile?.attributes) ? profile.attributes : {};
    return Object.entries(attrs);
  }, [profile?.attributes]);

  const emailStats = useMemo(() => {
    const direct = (profile as unknown as { emailStats?: unknown })?.emailStats;
    const obj = isJsonObject(direct)
      ? (direct as Record<string, unknown>)
      : null;
    if (
      obj &&
      typeof obj.openRate === "number" &&
      typeof obj.clickRate === "number"
    ) {
      return {
        openRate: obj.openRate as number,
        clickRate: obj.clickRate as number,
      };
    }
    const items = emailsQuery.data?.items ?? [];
    const sent = items.length;
    const opened = items.filter(
      (e) => !!e.openedAt || String(e.status).includes("open")
    ).length;
    const clicked = items.filter(
      (e) => !!e.clickedAt || String(e.status).includes("click")
    ).length;
    const openRate = sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0;
    const clickRate = sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0;
    return { openRate, clickRate };
  }, [emailsQuery.data, profile]);

  const onchainSummary = useMemo(() => {
    // Prefer the derived dapp-stats endpoint (true totals), then any summary
    // embedded on the profile, then fall back to the loaded transactions page.
    const dappStats = dappStatsQuery.data;
    if (
      dappStats &&
      typeof dappStats.transactions_count === "number" &&
      typeof dappStats.total_volume_usd === "number"
    ) {
      return {
        totalTxns: dappStats.transactions_count,
        totalVolumeUsd: dappStats.total_volume_usd,
      };
    }
    const direct = (profile as unknown as { onchainSummary?: unknown })
      ?.onchainSummary;
    const obj = isJsonObject(direct)
      ? (direct as Record<string, unknown>)
      : null;
    const totalTxns =
      obj && typeof obj.totalTxns === "number"
        ? (obj.totalTxns as number)
        : (transactionsQuery.data?.items?.length ?? 0);
    const totalVolumeUsd =
      obj && typeof obj.totalVolumeUsd === "number"
        ? (obj.totalVolumeUsd as number)
        : (transactionsQuery.data?.items ?? []).reduce((sum, t) => {
            const v = typeof t.valueUsd === "number" ? t.valueUsd : 0;
            return sum + v;
          }, 0);
    return { totalTxns, totalVolumeUsd };
  }, [dappStatsQuery.data, profile, transactionsQuery.data]);

  const copyWallet = () => {
    if (!walletFull) return;
    navigator.clipboard.writeText(walletFull).catch(() => undefined);
    setCopiedWallet(true);
    window.setTimeout(() => setCopiedWallet(false), 2000);
  };

  const getStatusStyles = (value: string) => {
    switch (value) {
      case "verified":
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
      case "pending":
        return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
      default:
        return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    }
  };

  const getStatusIcon = (value: string) => {
    switch (value) {
      case "verified":
        return <CheckCircleIcon className="h-3 w-3" aria-hidden="true" />;
      case "pending":
        return <ClockIcon className="h-3 w-3" aria-hidden="true" />;
      default:
        return <ExclamationCircleIcon className="h-3 w-3" aria-hidden="true" />;
    }
  };

  const isLoading =
    profileQuery.isLoading ||
    churnQuery.isLoading ||
    contractActivityQuery.isLoading ||
    emailsQuery.isLoading ||
    transactionsQuery.isLoading;

  return (
    <div
      className="mx-auto w-full max-w-[1600px] space-y-6"
      aria-busy={isLoading}
    >
      <Link
        href="/audience"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        Back to Audience
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {isLoading ? (
            <div className="h-14 w-14 rounded-full skeleton-wave" />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold text-white shadow-lg"
              style={{
                backgroundColor: `hsl(${hashHue(profile?.id ?? id)}, 70%, 50%)`,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              {isLoading ? (
                <div className="h-7 w-56 rounded skeleton-wave" />
              ) : (
                <>
                  <h1 className="break-all text-2xl font-light tracking-tight text-foreground">
                    {name}
                  </h1>
                  {status.length > 0 && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusStyles(status)}`}
                    >
                      {getStatusIcon(status)}
                      {status}
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {isLoading ? (
                <>
                  <div className="h-4 w-40 rounded skeleton-wave" />
                  <div className="h-4 w-4 rounded skeleton-wave" />
                  <div className="h-4 w-32 rounded skeleton-wave" />
                </>
              ) : (
                <>
                  <span className="break-all">
                    {hasEmailChannel ? email : "No email"}
                  </span>
                  {wallet.length > 0 && (
                    <>
                      <span className="text-muted-foreground/50">|</span>
                      <span
                        className="font-mono text-xs text-muted-foreground"
                        title={walletFull}
                      >
                        {wallet}
                      </span>
                    </>
                  )}
                  {walletFull.length > 0 && (
                    <>
                      <button
                        onClick={copyWallet}
                        className="hover:text-foreground transition-colors"
                        aria-label="Copy wallet address"
                      >
                        {copiedWallet ? (
                          <CheckCircleIcon
                            className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                            aria-hidden="true"
                          />
                        ) : (
                          <ClipboardDocumentIcon
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                      <a
                        href={`https://etherscan.io/address/${walletFull}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                        aria-label="Open wallet in explorer"
                      >
                        <ArrowTopRightOnSquareIcon
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </a>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {hasEmailChannel ? (
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="flex shrink-0 items-center gap-2 self-start rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <EnvelopeIcon className="h-4 w-4" aria-hidden="true" />
            Send Email
          </button>
        ) : (
          <button
            disabled
            title="This contact has no email channel - reach them with an in-app push instead."
            className="flex shrink-0 cursor-not-allowed items-center gap-2 self-start rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground opacity-50"
          >
            <EnvelopeIcon className="h-4 w-4" aria-hidden="true" />
            Send Email
          </button>
        )}
      </div>

      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        recipients={
          hasEmailChannel ? [{ id: profile?.id ?? id, name, email }] : []
        }
      />

      <div className="mb-10 flex flex-wrap items-center gap-2">
        {isLoading ? (
          <>
            <div className="h-7 w-20 rounded-full skeleton-wave" />
            <div className="h-7 w-28 rounded-full skeleton-wave" />
            <div className="h-7 w-24 rounded-full skeleton-wave" />
          </>
        ) : (
          <>
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1.5 pl-3 pr-1.5 text-xs font-medium text-muted-foreground shadow-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTagMutation.mutate(tag)}
                  disabled={removeTagMutation.isPending}
                  aria-label={`Remove tag ${tag}`}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <XMarkIcon className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            {tags.length === 0 && (
              <span className="text-sm text-muted-foreground">No tags</span>
            )}
            {hasId && (
              <ApplyTagsPopover
                availableTags={availableTags}
                activeTags={tags}
                isApplying={addTagsMutation.isPending}
                align="start"
                onApply={(next) => addTagsMutation.mutateAsync(next)}
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Add tag
                  </button>
                }
              />
            )}
          </>
        )}
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {intelligenceSegments.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CursorArrowRaysIcon
                className="h-5 w-5 text-sky-600 dark:text-sky-400"
                aria-hidden="true"
              />
              <h3 className="text-sm font-medium text-foreground">
                Intelligence Segments
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {intelligenceSegments.map((seg) => (
                <span
                  key={seg}
                  className="rounded-full bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300"
                >
                  {seg}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <CubeIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-medium text-foreground">
              Contract Activity
            </h3>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Contracts this wallet has interacted with on tracked chains.
          </p>
          <div className="space-y-3">
            {contractActivityQuery.isLoading ? (
              <>
                <div className="h-9 w-full rounded skeleton-wave" />
                <div className="h-9 w-full rounded skeleton-wave" />
                <div className="h-9 w-2/3 rounded skeleton-wave" />
              </>
            ) : (contractActivityQuery.data?.items ?? []).length > 0 ? (
              <>
                {(contractActivityQuery.data?.items ?? []).map(
                  (cl: AudienceProfileContractActivity) => (
                    <div
                      key={cl.contractAddress}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {cl.chain ? (
                            <ChainLogo chain={cl.chain} size={14} />
                          ) : null}
                          <span className="truncate font-medium text-foreground">
                            {cl.contractName?.length
                              ? cl.contractName
                              : shortenWallet(cl.contractAddress)}
                          </span>
                          {cl.label?.length ? (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary ring-1 ring-primary/20">
                              {cl.label}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1">
                          <code
                            className="font-mono text-xs text-muted-foreground"
                            title={cl.contractAddress}
                          >
                            {shortenWallet(cl.contractAddress)}
                          </code>
                          <CopyButton
                            value={cl.contractAddress}
                            label="Copy contract address"
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-medium text-foreground">
                          {typeof cl.txCount === "number"
                            ? `${cl.txCount.toLocaleString()} ${cl.txCount === 1 ? "interaction" : "interactions"}`
                            : "-"}
                        </p>
                        {typeof cl.volumeUsd === "number" ? (
                          <p className="text-xs text-muted-foreground">
                            {formatUsd(cl.volumeUsd)}
                          </p>
                        ) : null}
                        {cl.lastInteractionAt ? (
                          <p
                            className="text-xs text-muted-foreground"
                            title={formatDateTime(cl.lastInteractionAt)}
                          >
                            {formatRelativeTime(cl.lastInteractionAt)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )
                )}
                {contractActivityQuery.data?.refreshedAt ? (
                  <p className="pt-1 text-xs text-muted-foreground">
                    Updated{" "}
                    {formatDateTime(contractActivityQuery.data.refreshedAt)}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                No contract activity recorded yet
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ExclamationCircleIcon
              className={`h-5 w-5 ${
                churnQuery.data?.risk === "high"
                  ? "text-rose-600 dark:text-rose-400"
                  : churnQuery.data?.risk === "medium"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
              }`}
              aria-hidden="true"
            />
            <h3 className="text-sm font-medium text-foreground">
              Churn Prediction
            </h3>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-5 w-full rounded skeleton-wave" />
              <div className="h-5 w-2/3 rounded skeleton-wave" />
            </div>
          ) : churnQuery.data ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    churnQuery.data.risk === "high"
                      ? "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-300"
                      : churnQuery.data.risk === "medium"
                        ? "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
                        : "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300"
                  }`}
                >
                  {churnQuery.data.risk === "high"
                    ? "High Risk"
                    : churnQuery.data.risk === "medium"
                      ? "Medium Risk"
                      : "Low Risk"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Score: {churnQuery.data.score}/100
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Predicted LTV</span>
                <span className="font-semibold text-foreground">
                  {typeof churnQuery.data.predictedLtvUsd === "number"
                    ? formatUsd(churnQuery.data.predictedLtvUsd)
                    : "Not available"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No churn prediction
            </div>
          )}
        </div>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Email Open Rate
          </p>
          <p className="mt-2 text-2xl font-light text-foreground sm:text-3xl">
            {emailStats.openRate}%
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Click Rate
          </p>
          <p className="mt-2 text-2xl font-light text-foreground sm:text-3xl">
            {emailStats.clickRate}%
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Txns
          </p>
          <p className="mt-2 text-2xl font-light text-foreground sm:text-3xl">
            {onchainSummary.totalTxns}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Volume
          </p>
          <p className="mt-2 break-words text-2xl font-light text-foreground sm:text-3xl">
            {onchainSummary.totalVolumeUsd > 0
              ? formatUsd(onchainSummary.totalVolumeUsd)
              : "Not available"}
          </p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {(["activity", "attributes", "emails", "transactions"] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-4 py-3 text-sm font-medium transition-colors sm:px-6 ${
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "activity"
                ? "Activity Timeline"
                : tab === "attributes"
                  ? "Attributes"
                  : tab === "emails"
                    ? "Email History"
                    : "Transactions"}
            </button>
          )
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        {activeTab === "activity" && (
          <div>
            <RegionHeading
              title="Activity Timeline"
              description="Recent onchain and platform events for this contact."
            />
            <div className="space-y-4">
              {activityQuery.isLoading ? (
                <>
                  <div className="h-16 w-full rounded-xl skeleton-wave" />
                  <div className="h-16 w-full rounded-xl skeleton-wave" />
                  <div className="h-16 w-2/3 rounded-xl skeleton-wave" />
                </>
              ) : (activityQuery.data?.items ?? []).length > 0 ? (
                (activityQuery.data?.items ?? []).map(
                  (item: AudienceProfileActivityEvent) => {
                    const Icon = activityIconForType(item.type);
                    const relative = formatRelativeTime(item.at);
                    const absolute = formatDateTime(item.at);
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-4 rounded-xl p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">
                            {item.title}
                          </p>
                          {item.description?.length ? (
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-muted-foreground">
                            {relative.length > 0 ? relative : item.at}
                          </p>
                          {absolute.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {absolute}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                )
              ) : (
                <div className="text-sm text-muted-foreground">
                  No activity recorded for this contact yet
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "attributes" && (
          <div>
            <RegionHeading
              title="Attributes"
              description="Traits derived from this wallet's onchain behavior and enrichment."
            />
            {profileQuery.isLoading ? (
              <div className="space-y-3">
                <div className="h-6 w-full rounded skeleton-wave" />
                <div className="h-6 w-full rounded skeleton-wave" />
                <div className="h-6 w-2/3 rounded skeleton-wave" />
              </div>
            ) : profileAttributes.length > 0 ? (
              <dl className="divide-y divide-border">
                {profileAttributes.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 py-2.5 text-sm"
                  >
                    <dt className="shrink-0 text-muted-foreground">
                      {prettifyKey(key)}
                    </dt>
                    <dd className="flex min-w-0 items-center gap-1 text-right font-medium text-foreground">
                      {isAddressLike(value) ? (
                        <>
                          <code
                            className="font-mono text-xs text-foreground"
                            title={value}
                          >
                            {shortenWallet(value)}
                          </code>
                          <CopyButton value={value} label="Copy address" />
                        </>
                      ) : (
                        <span
                          className="truncate"
                          title={formatAttributeValue(value)}
                        >
                          {formatAttributeValue(value) || "-"}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="text-sm text-muted-foreground">
                No attributes recorded yet - run enrichment to derive onchain
                traits
              </div>
            )}
          </div>
        )}

        {activeTab === "emails" && (
          <div>
            <RegionHeading
              title="Email History"
              description="Campaign emails sent to this contact and their engagement."
            />
            <div className="space-y-3">
              {emailsQuery.isLoading ? (
                <>
                  <div className="h-16 w-full rounded-xl skeleton-wave" />
                  <div className="h-16 w-full rounded-xl skeleton-wave" />
                  <div className="h-16 w-2/3 rounded-xl skeleton-wave" />
                </>
              ) : (emailsQuery.data?.items ?? []).length > 0 ? (
                (emailsQuery.data?.items ?? []).map(
                  (emailItem: AudienceProfileEmailEvent) => {
                    const status = String(emailItem.status);
                    const sentAbsolute = formatDateTime(emailItem.sentAt);
                    return (
                      <div
                        key={emailItem.id}
                        className="flex items-center justify-between rounded-xl p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                            {status === "clicked" ? (
                              <CursorArrowRaysIcon
                                className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                                aria-hidden="true"
                              />
                            ) : status === "opened" ? (
                              <EyeIcon
                                className="h-4 w-4 text-sky-600 dark:text-sky-400"
                                aria-hidden="true"
                              />
                            ) : status === "bounced" ? (
                              <ExclamationCircleIcon
                                className="h-4 w-4 text-rose-600 dark:text-rose-400"
                                aria-hidden="true"
                              />
                            ) : (
                              <PaperAirplaneIcon
                                className="h-4 w-4 text-muted-foreground"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {emailItem.subject}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              Sent{" "}
                              {sentAbsolute.length > 0
                                ? sentAbsolute
                                : emailItem.sentAt}
                              {emailItem.campaignId
                                ? ` · Campaign ${emailItem.campaignId}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ${
                            status === "clicked"
                              ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300"
                              : status === "opened"
                                ? "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300"
                                : status === "bounced"
                                  ? "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-300"
                                  : "bg-muted text-muted-foreground ring-1 ring-border"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    );
                  }
                )
              ) : (
                <div className="text-sm text-muted-foreground">
                  No campaign emails have been sent to this contact yet
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div>
            <RegionHeading
              title="Transactions"
              description="Onchain transactions from tracked chains."
            />
            <div className="space-y-3">
              {transactionsQuery.isLoading ? (
                <>
                  <div className="h-16 w-full rounded-xl skeleton-wave" />
                  <div className="h-16 w-full rounded-xl skeleton-wave" />
                  <div className="h-16 w-2/3 rounded-xl skeleton-wave" />
                </>
              ) : (transactionsQuery.data?.items ?? []).length > 0 ? (
                (transactionsQuery.data?.items ?? []).map(
                  (tx: AudienceProfileTransaction) => {
                    const walletLower = walletFull.toLowerCase();
                    const direction =
                      walletLower.length > 0 &&
                      typeof tx.from === "string" &&
                      tx.from.toLowerCase() === walletLower
                        ? "out"
                        : walletLower.length > 0 &&
                            typeof tx.to === "string" &&
                            tx.to.toLowerCase() === walletLower
                          ? "in"
                          : null;
                    const timeAbsolute = formatDateTime(tx.blockTimestamp);
                    const timeRelative = formatRelativeTime(tx.blockTimestamp);
                    return (
                      <div
                        key={tx.hash}
                        className="flex items-center justify-between rounded-xl p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                            <CubeIcon
                              className="h-4 w-4 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-1.5">
                              {tx.chain ? (
                                <ChainLogo chain={tx.chain} size={14} />
                              ) : null}
                              <code
                                className="truncate font-mono text-sm font-medium text-foreground"
                                title={tx.hash}
                              >
                                {shortenWallet(tx.hash)}
                              </code>
                              <CopyButton
                                value={tx.hash}
                                label="Copy transaction hash"
                              />
                              {direction === "in" ? (
                                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                                  Received
                                </span>
                              ) : direction === "out" ? (
                                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
                                  Sent
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-sm text-muted-foreground">
                              {shortenWallet(tx.from)} → {shortenWallet(tx.to)}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-medium text-foreground">
                            {typeof tx.valueUsd === "number"
                              ? formatUsd(tx.valueUsd)
                              : [tx.value, tx.asset]
                                  .filter(
                                    (part) =>
                                      typeof part === "string" &&
                                      part.length > 0
                                  )
                                  .join(" ") || "-"}
                          </p>
                          <p
                            className="text-xs text-muted-foreground"
                            title={
                              timeAbsolute.length > 0 ? timeAbsolute : undefined
                            }
                          >
                            {timeRelative.length > 0
                              ? timeRelative
                              : timeAbsolute.length > 0
                                ? timeAbsolute
                                : tx.blockTimestamp}
                          </p>
                        </div>
                      </div>
                    );
                  }
                )
              ) : (
                <div className="text-sm text-muted-foreground">
                  No transactions recorded on tracked chains yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
