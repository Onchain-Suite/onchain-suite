"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { cn } from "@/lib/utils";

import { type CampaignAudienceEstimate } from "../../campaigns.service";
import {
  ALL_CONTACTS_SELECTION_ID,
  getEstimatedRecipientsFromSelection,
  isAllContactsSelected,
  partitionAudienceSelection,
  reachabilityGate,
  reachChannelCount,
  resolveTagsToProfileIds,
} from "../../lib/audience";
import {
  isRateLimitError,
  seedAudienceSyncCache,
  syncAudienceSettings,
} from "../../lib/audience-sync";
import type { List, Segment } from "../../types";
import type { CampaignFormData } from "../../validations";
import { type ContactOption } from "./audience-selector";
import {
  type AudienceProfile,
  audienceService,
} from "@/features/audience/audience.service";
import {
  deriveDisplayName,
  extractWalletFields,
  isSyntheticWalletEmail,
  normalizeTags,
  profileReach,
} from "@/features/audience/utils";
import { smartSendingService } from "@/features/settings/smart-sending.service";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

interface AudienceStepProps {
  form: UseFormReturn<CampaignFormData>;
  campaignId?: string | null;
  canSync?: boolean;
  lists?: List[];
  /** Audience tags as pickable pseudo-lists (`tag:<name>` ids). */
  tags?: List[];
  segments?: Segment[];
  segmentsLoading?: boolean;
  segmentsError?: string | null;
  /** Lifts the live recipient estimate up so the wizard summary rail can show
   * it on every step. */
  onEstimateChange?: (value: number | null) => void;
}

const getEstimatedRecipientsValue = (estimate: CampaignAudienceEstimate) => {
  // Canonical field per POST /campaigns/{id}/audience/estimate, with legacy
  // fallbacks for older response shapes.
  if (typeof estimate.recipientCount === "number") {
    return estimate.recipientCount;
  }
  if (typeof estimate.estimatedRecipients === "number") {
    return estimate.estimatedRecipients;
  }
  if (typeof estimate.recipients === "number") {
    return estimate.recipients;
  }
  return null;
};

type SendTab = "segments" | "lists" | "tags" | "contacts" | "everyone";

export function AudienceStep({
  form,
  campaignId,
  canSync = false,
  lists = [],
  tags = [],
  segments = [],
  segmentsLoading = false,
  segmentsError,
  onEstimateChange,
}: AudienceStepProps) {
  const segmentsHref = PRIVATE_ROUTES.INTELLIGENCE_SEGMENTS;
  const accountSettingsHref = `${PRIVATE_ROUTES.SETTINGS}?tab=account`;
  const channel = form.watch("channel");
  const isPush = channel === "in-app-push";
  const selectedAudiences = form.watch("selectedAudiences");
  const smartSending = form.watch("smartSending");
  const windowOverrideDraft = form.watch("smartSendingWindowHours");
  const trackingParameters = form.watch("trackingParameters");
  const utmSource = form.watch("utmSource");
  const utmMedium = form.watch("utmMedium");
  const utmCampaign = form.watch("utmCampaign");
  const utmTerm = form.watch("utmTerm");
  const utmContent = form.watch("utmContent");
  const [estimatedRecipients, setEstimatedRecipients] = useState<number | null>(
    null
  );
  // Full "Don't send to" breakdown from the last estimate (real backend counts).
  const [estimateBreakdown, setEstimateBreakdown] =
    useState<CampaignAudienceEstimate | null>(null);
  // Internal/team wallets are an exclusion filter the sender can toggle off.
  const [includeInternal, setIncludeInternal] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sendTab, setSendTab] = useState<SendTab>("everyone");
  const [utmOpen, setUtmOpen] = useState(false);
  const syncSequenceRef = useRef(0);

  // Contact picker search. Large audiences (10k+) can't all render, so the
  // search runs server-side (debounced) and the list shows a page at a time.
  const [contactSearch, setContactSearch] = useState("");
  const [debouncedContactSearch, setDebouncedContactSearch] = useState("");
  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedContactSearch(contactSearch.trim()),
      300
    );
    return () => window.clearTimeout(id);
  }, [contactSearch]);

  const CONTACTS_PAGE_LIMIT = 200;

  // Individual contacts (with a real email) selectable directly - so a
  // campaign can be sent to specific people even with no tags/segments ready.
  const contactsQuery = useQuery({
    queryKey: [
      "audience",
      "profiles",
      "campaign-contacts",
      debouncedContactSearch,
    ],
    queryFn: async () => {
      const res = await audienceService.listProfiles({
        page: 1,
        limit: CONTACTS_PAGE_LIMIT,
        ...(debouncedContactSearch ? { q: debouncedContactSearch } : {}),
      });
      const envelope = res as {
        items?: AudienceProfile[];
        data?: AudienceProfile[];
      };
      const rows: AudienceProfile[] = Array.isArray(res)
        ? res
        : Array.isArray(envelope.items)
          ? envelope.items
          : Array.isArray(envelope.data)
            ? envelope.data
            : [];
      return rows
        .map((profile): ContactOption | null => {
          const id = typeof profile.id === "string" ? profile.id.trim() : "";
          if (id.length === 0) return null;
          const rawEmail =
            typeof profile.email === "string" ? profile.email.trim() : "";
          // A synthetic wallet-placeholder email is not a real, sendable email.
          const email =
            rawEmail.length > 0 && !isSyntheticWalletEmail(rawEmail)
              ? rawEmail
              : "";
          const { walletFull, wallet: walletShort } =
            extractWalletFields(profile);
          // Keep anyone reachable on at least one channel; the per-channel
          // filter (email for Direct, wallet for In-app) is applied in `contacts`
          // so switching channel never refetches.
          if (email.length === 0 && walletFull.length === 0) return null;
          return {
            id,
            email,
            walletAddress: walletFull,
            walletShort,
            name: deriveDisplayName({
              name: profile.name,
              fullName: (profile as { fullName?: unknown }).fullName,
              email: email || undefined,
              wallet: walletFull,
              walletAddress: walletFull,
            }),
          };
        })
        .filter((c): c is ContactOption => c !== null);
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
  // Every fetched contact reachable on at least one channel (raw, for the
  // "showing the first N" footer which reflects the page size, not the filter).
  const fetchedContacts = useMemo(
    () => contactsQuery.data ?? [],
    [contactsQuery.data]
  );
  // Show EVERY contact (anyone reachable on at least one channel). The picker
  // doesn't hide contacts the current channel can't reach - it dims them and
  // makes them non-selectable in the render, with the reason, exactly like the
  // group rows. Hiding them made the list look empty/partial ("I only see some").
  const contacts = fetchedContacts;

  // The suppression window is org-configurable, so read it rather than
  // quoting a hardcoded number. `windowHours` always comes back concrete
  // (org value, else platform default).
  const smartSendingQuery = useQuery({
    queryKey: ["organization", "settings", "smart-sending"],
    queryFn: () => smartSendingService.getSettings(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
  const smartSendingWindow = smartSendingQuery.data?.windowHours ?? null;

  // Live audience totals so the "Everyone" option shows a real reachable count
  // rather than a vague statement.
  const overviewQuery = useQuery({
    queryKey: ["audience", "overview"],
    queryFn: () => audienceService.getOverview(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const overview = overviewQuery.data;

  // Robust total-contacts fallback (the overview may omit reachable counts).
  const audienceCountQuery = useQuery({
    queryKey: ["audience", "profiles", "count"],
    queryFn: async () => {
      const res = await audienceService.listProfiles({ page: 1, limit: 1 });
      const meta = (res as { meta?: { totalItems?: number } })?.meta;
      return typeof meta?.totalItems === "number" ? meta.totalItems : null;
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const audienceTotal = audienceCountQuery.data ?? null;

  // Reachability, computed client-side EXACTLY like the Audience section (shared
  // `profileReach`). The `/audience/overview` aggregate under-counts imported
  // contacts (reads emailReachable 0), so the Audience page already counts it
  // straight from the profiles when the whole audience fits one page - we carry
  // that same computation here so the campaign's "Everyone" count matches the
  // Audience tile instead of showing 0.
  const reachableCountQuery = useQuery({
    queryKey: ["audience", "campaign-reachable-count"],
    queryFn: async () => {
      const res = await audienceService.listProfiles({
        page: 1,
        limit: 200,
        include: "wallets,attributes,tags",
      });
      const obj = res as {
        items?: AudienceProfile[];
        data?: AudienceProfile[];
        meta?: { totalItems?: number };
      };
      const items = Array.isArray(res) ? res : (obj.items ?? obj.data ?? []);
      const metaTotal =
        !Array.isArray(res) && typeof obj.meta?.totalItems === "number"
          ? obj.meta.totalItems
          : undefined;
      const complete =
        items.length < 200 ||
        (typeof metaTotal === "number" && metaTotal <= items.length);
      let email = 0;
      let push = 0;
      // Per-tag channel-reachable counts. /audience/tags returns no count, so the
      // campaign picker otherwise showed every tag as 0; here we count how many
      // sampled contacts carry each tag AND are reachable on the channel.
      const tagReach: Record<string, { email: number; push: number }> = {};
      for (const p of items) {
        const r = profileReach(p);
        if (r.email) email += 1;
        if (r.push) push += 1;
        for (const name of normalizeTags((p as { tags?: unknown }).tags)) {
          const cur = tagReach[name] ?? { email: 0, push: 0 };
          if (r.email) cur.email += 1;
          if (r.push) cur.push += 1;
          tagReach[name] = cur;
        }
      }
      return { email, push, complete, tagReach };
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  // Trust the exact client-side count only when we've seen the whole audience;
  // above the 200-page cap defer to the (under-counting) overview aggregate.
  // Per-tag reachable counts, trusted only when we've seen the whole audience.
  const computedTagReach = reachableCountQuery.data?.complete
    ? reachableCountQuery.data.tagReach
    : null;
  const computedEmailReachable = reachableCountQuery.data?.complete
    ? reachableCountQuery.data.email
    : null;
  const computedPushReachable = reachableCountQuery.data?.complete
    ? reachableCountQuery.data.push
    : null;

  const allSelected = isAllContactsSelected(selectedAudiences);

  // "Everyone" is channel-aware: an email campaign reaches every email-reachable
  // contact; an in-app push reaches every connected wallet. When Everyone is the
  // active selection, the estimate's totalWallets is the real audience size.
  const everyoneReachable = ((): number | null => {
    const pick = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) ? v : null;
    const breakdownTotal = allSelected
      ? pick(estimateBreakdown?.totalWallets)
      : null;
    if (isPush) {
      return (
        breakdownTotal ??
        computedPushReachable ??
        pick(overview?.pushReachable) ??
        pick(overview?.withWallet) ??
        pick(overview?.total) ??
        audienceTotal
      );
    }
    return (
      breakdownTotal ??
      computedEmailReachable ??
      pick(overview?.emailReachable) ??
      pick(overview?.total) ??
      audienceTotal
    );
  })();

  // Contacts double as count-1 "lists" for the local recipient estimate and
  // for resolving selected ids into profileIds at sync time.
  const contactsAsLists = useMemo<List[]>(
    () =>
      contacts.map((c) => ({
        id: c.id,
        name: c.name,
        count: 1,
        starred: false,
      })),
    [contacts]
  );
  const profileOptions = useMemo<List[]>(
    () => [...lists, ...contactsAsLists],
    [lists, contactsAsLists]
  );

  const localEstimatedRecipients = useMemo(() => {
    // "Everyone" resolves to the whole reachable audience; the backend estimate
    // refines it, this is the immediate local figure.
    if (isAllContactsSelected(selectedAudiences)) {
      return everyoneReachable ?? 0;
    }
    return getEstimatedRecipientsFromSelection(
      selectedAudiences,
      [...profileOptions, ...tags],
      segments
    );
  }, [profileOptions, tags, segments, selectedAudiences, everyoneReachable]);

  // Assemble the UTM object sent to the backend (only when tracking is on and
  // at least one value is set). Keys map to utm_source/medium/campaign/…
  const utmParams = useMemo(() => {
    if (!trackingParameters) return undefined;
    const out: Record<string, string> = {};
    const add = (key: string, value: string | undefined) => {
      const trimmed = (value ?? "").trim();
      if (trimmed.length > 0) out[key] = trimmed;
    };
    add("source", utmSource);
    add("medium", utmMedium);
    add("campaign", utmCampaign);
    add("term", utmTerm);
    add("content", utmContent);
    return Object.keys(out).length > 0 ? out : undefined;
  }, [
    trackingParameters,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
  ]);

  // Stable, content-based signatures for the autosync effect. Depending on the
  // raw arrays would re-fire the effect on every render (the `lists` prop
  // defaults to a fresh array each time), leaving the recipient spinner
  // rolling forever. Keys change only when the underlying data actually does.
  const selectionKey = useMemo(
    () => selectedAudiences.join("|"),
    [selectedAudiences]
  );
  const segmentsKey = useMemo(
    () => segments.map((s) => `${s.id}:${s.count}`).join("|"),
    [segments]
  );
  const profileOptionsKey = useMemo(
    () => profileOptions.map((p) => p.id).join("|"),
    [profileOptions]
  );
  const utmKey = useMemo(() => JSON.stringify(utmParams ?? null), [utmParams]);

  // Blank / invalid → undefined, i.e. inherit the org window rather than
  // sending a value the backend would reject.
  const windowOverride = useMemo(() => {
    const trimmed = (windowOverrideDraft ?? "").trim();
    if (trimmed.length === 0) return undefined;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 168
      ? parsed
      : undefined;
  }, [windowOverrideDraft]);

  // Latest values read inside the effect without widening its deps.
  const syncInputsRef = useRef({
    selectedAudiences,
    segments,
    lists,
    profileOptions,
    utmParams,
    windowOverride,
  });
  syncInputsRef.current = {
    selectedAudiences,
    segments,
    lists,
    profileOptions,
    utmParams,
    windowOverride,
  };

  // Live autosync. The backend rate-limits these endpoints (3 requests/10s),
  // so this only sends payloads that actually changed (see audience-sync.ts):
  // the first run seeds the change cache from hydrated state and just fetches
  // the recipient estimate; later runs write only the changed settings. A 429
  // is retried once after the limit window instead of surfacing an error.
  const hasSeededSyncRef = useRef(false);
  useEffect(() => {
    if (!campaignId || !canSync) return;

    const currentSequence = syncSequenceRef.current + 1;
    syncSequenceRef.current = currentSequence;
    setIsSyncing(true);
    setSyncError(null);

    let retryTimeout: number | undefined;

    const buildPayloads = async () => {
      const inputs = syncInputsRef.current;
      const { all, segmentIds, profileIds, tagNames } =
        partitionAudienceSelection(inputs.selectedAudiences, inputs.segments);
      // Audience Lists are saved segments too, but they aren't in the
      // intelligence `segments` array, so partition drops their ids into
      // profileIds. Reclassify them as segmentIds (a list id is a segment id,
      // not a profile id); real contacts stay in profileIds.
      const listIds = new Set(inputs.lists.map((l) => l.id));
      const listSegmentIds = profileIds.filter((id) => listIds.has(id));
      const nonListProfileIds = profileIds.filter((id) => !listIds.has(id));
      // Tag selections expand to the tagged contacts' profile ids - the
      // backend audience contract only knows profiles + segments. ("All
      // contacts" short-circuits to empty tags, so this is a no-op.)
      const tagProfileIds = await resolveTagsToProfileIds(tagNames);
      const mergedProfileIds = Array.from(
        new Set([...nonListProfileIds, ...tagProfileIds])
      );
      return {
        audience: {
          segmentIds: Array.from(new Set([...segmentIds, ...listSegmentIds])),
          profileIds: mergedProfileIds,
          ...(all ? { all: true } : {}),
        },
        tracking: {
          smartSending: Boolean(smartSending),
          trackingParameters: Boolean(trackingParameters),
          // Omitted when blank so the org setting applies.
          ...(inputs.windowOverride !== undefined
            ? { smartSendingWindowHours: inputs.windowOverride }
            : {}),
          ...(inputs.utmParams ? { utm: inputs.utmParams } : {}),
        },
      };
    };

    const run = async (attempt: number) => {
      const payloads = await buildPayloads();
      if (syncSequenceRef.current !== currentSequence) return;
      const isFirstRun = !hasSeededSyncRef.current;
      if (isFirstRun) {
        seedAudienceSyncCache(campaignId, payloads.audience, payloads.tracking);
        hasSeededSyncRef.current = true;
      }
      try {
        const { estimate } = await syncAudienceSettings(campaignId, {
          ...payloads,
          forceEstimate: isFirstRun,
        });
        if (syncSequenceRef.current !== currentSequence) return;
        if (estimate) {
          setEstimatedRecipients(getEstimatedRecipientsValue(estimate));
          setEstimateBreakdown(estimate);
        }
        setIsSyncing(false);
      } catch (error) {
        if (syncSequenceRef.current !== currentSequence) return;
        if (isRateLimitError(error) && attempt === 0) {
          // The budget resets every 10s - retry once after the window.
          retryTimeout = window.setTimeout(() => {
            run(1).catch(() => undefined);
          }, 11_000);
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to sync audience settings";
        setSyncError(message);
        setIsSyncing(false);
      }
    };

    const timeout = window.setTimeout(() => {
      run(0).catch(() => undefined);
    }, 800);

    return () => {
      window.clearTimeout(timeout);
      if (retryTimeout !== undefined) window.clearTimeout(retryTimeout);
    };
  }, [
    campaignId,
    canSync,
    selectionKey,
    segmentsKey,
    profileOptionsKey,
    smartSending,
    windowOverride,
    trackingParameters,
    utmKey,
  ]);

  const displayedEstimatedRecipients =
    estimatedRecipients ?? localEstimatedRecipients;

  useEffect(() => {
    onEstimateChange?.(displayedEstimatedRecipients);
  }, [displayedEstimatedRecipients, onEstimateChange]);

  const setChannel = (next: "email" | "in-app-push") =>
    form.setValue("channel", next, { shouldDirty: true });

  const toggleSelection = (id: string) => {
    // Picking a specific audience clears the mutually-exclusive "Everyone".
    const base = selectedAudiences.filter(
      (x) => x !== ALL_CONTACTS_SELECTION_ID
    );
    const next = base.includes(id)
      ? base.filter((x) => x !== id)
      : [...base, id];
    form.setValue("selectedAudiences", next, { shouldDirty: true });
  };

  // "Everyone" is exclusive: selecting it replaces any specific picks.
  const toggleEveryone = () => {
    form.setValue(
      "selectedAudiences",
      allSelected ? [] : [ALL_CONTACTS_SELECTION_ID],
      { shouldDirty: true }
    );
  };
  const clearSelection = () =>
    form.setValue("selectedAudiences", [], { shouldDirty: true });

  const isSelected = (id: string) => selectedAudiences.includes(id);
  const selectedCount = selectedAudiences.length;

  // Per-tab totals so the footer can read "N of M selected" for the open tab.
  const tabTotal =
    sendTab === "segments"
      ? segments.length
      : sendTab === "lists"
        ? lists.length
        : sendTab === "tags"
          ? tags.length
          : sendTab === "contacts"
            ? contacts.length
            : 0;
  const tabSelected =
    sendTab === "segments"
      ? segments.filter((s) => isSelected(s.id)).length
      : sendTab === "lists"
        ? lists.filter((l) => isSelected(l.id)).length
        : sendTab === "tags"
          ? tags.filter((t) => isSelected(t.id)).length
          : sendTab === "contacts"
            ? contacts.filter((c) => isSelected(c.id)).length
            : 0;

  const SEND_TABS: { key: SendTab; label: string }[] = [
    { key: "everyone", label: "Everyone" },
    { key: "lists", label: "Lists" },
    { key: "tags", label: "Tags" },
    { key: "contacts", label: "Contacts" },
    { key: "segments", label: "Segments" },
  ];

  // "Don't send to" is a set of exclusion filters. Suppressed/unsubscribed is
  // always applied (compliance, locked). "Messaged recently" is dropped here
  // because it is exactly the Smart sending toggle below (backend:
  // excludedBySmartSending === messagedRecently). Counts come from the estimate.
  const asCount = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const suppressedCount = asCount(estimateBreakdown?.suppressed);
  const internalCount = asCount(estimateBreakdown?.internal);
  // `missingEmail` = selected contacts with no email address at all (wallet-only
  // contacts, which an email campaign can't reach). `totalWallets` is the whole
  // selected audience, not a wallet count - so the copy says "recipients", and
  // the banner only shows when someone is actually skipped (never "0 of N").
  const missingEmailCount = asCount(estimateBreakdown?.missingEmail);
  const totalRecipientCount = asCount(estimateBreakdown?.totalWallets);
  const exclusions = [
    {
      key: "suppressed",
      label: "Suppressed & unsubscribed",
      count: suppressedCount,
      applied: true,
      locked: true,
    },
    {
      key: "internal",
      label: isPush ? "Internal / team wallets" : "Internal / team contacts",
      count: internalCount,
      applied: !includeInternal,
      locked: false,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Who gets this?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the campaign type, then choose segments, lists, tags, contacts,
          or everyone.
        </p>
      </div>

      {/* Campaign type */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Campaign type</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              key: "email" as const,
              icon: EnvelopeIcon,
              title: "Direct campaign",
              sub: "Sent to contacts with an email",
            },
            {
              key: "in-app-push" as const,
              icon: DevicePhoneMobileIcon,
              title: "In-app push",
              sub: "Sent to connected wallets",
            },
          ].map((opt) => {
            const active =
              opt.key === "email" ? !isPush : channel === "in-app-push";
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setChannel(opt.key)}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/[0.06]"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg",
                      active
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <opt.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {opt.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {opt.sub}
                    </span>
                  </span>
                </span>
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full border",
                    active ? "border-primary" : "border-border"
                  )}
                >
                  {active ? (
                    <span className="size-2 rounded-full bg-primary" />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {isPush
            ? "Delivered in-app to connected wallets."
            : "Delivered by email - contacts need an email address."}
        </p>
      </div>

      {/* Send to */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Send to</p>
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1 text-sm">
          {SEND_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSendTab(tab.key)}
              className={cn(
                "rounded-md px-3 py-1 transition-colors",
                sendTab === tab.key
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {sendTab === "segments" ? (
            <SelectList
              rows={segments.map((s) => ({
                id: s.id,
                title: s.name,
                sub:
                  typeof (s as { description?: string }).description ===
                  "string"
                    ? (s as { description?: string }).description
                    : undefined,
                count: reachChannelCount(s.reachable, isPush) ?? s.count,
                ...reachabilityGate(s.reachableVia, isPush),
              }))}
              loading={segmentsLoading}
              searchPlaceholder="Search segments…"
              emptyText={
                <>
                  No saved segments.{" "}
                  <Link href={segmentsHref} className="text-primary underline">
                    Create one
                  </Link>
                  .
                </>
              }
              isSelected={isSelected}
              onToggle={toggleSelection}
            />
          ) : sendTab === "lists" ? (
            <SelectList
              rows={lists.map((l) => ({
                id: l.id,
                title: l.name,
                count: reachChannelCount(l.reachable, isPush) ?? l.count,
                ...reachabilityGate(l.reachableVia, isPush),
              }))}
              searchPlaceholder="Search lists…"
              emptyText="No lists yet - save a segment or tag to reuse it."
              isSelected={isSelected}
              onToggle={toggleSelection}
            />
          ) : sendTab === "tags" ? (
            <SelectList
              rows={tags.map((t) => {
                // Prefer the server's send-grade count; else the profile-sample
                // count (the tags API historically sent none); else the raw tag
                // count. A backend 0 is real - don't fall through it.
                const count =
                  reachChannelCount(t.reachable, isPush) ??
                  reachChannelCount(computedTagReach?.[t.name], isPush) ??
                  t.count;
                return {
                  id: t.id,
                  title: t.name,
                  count,
                  ...reachabilityGate(t.reachableVia, isPush),
                };
              })}
              searchPlaceholder="Search tags…"
              emptyText={
                <>
                  No tags yet. Tag a contact in{" "}
                  <Link
                    href={PRIVATE_ROUTES.AUDIENCE}
                    className="text-primary underline"
                  >
                    Audience
                  </Link>{" "}
                  to make it pickable here.
                </>
              }
              isSelected={isSelected}
              onToggle={toggleSelection}
            />
          ) : sendTab === "contacts" ? (
            <SelectList
              rows={contacts.map((c) => {
                const hasWallet = (c.walletAddress ?? "").length > 0;
                const reachable = isPush ? hasWallet : c.email.length > 0;
                return {
                  id: c.id,
                  title: c.name,
                  // Show the identity the current channel actually uses (wallet
                  // for in-app, email for direct); the other is irrelevant here.
                  trailing: isPush
                    ? (c.walletShort ?? c.walletAddress ?? "")
                    : c.email,
                  // Everyone is listed; a contact the current channel can't
                  // reach is dimmed + non-selectable with the reason.
                  ...(reachable
                    ? {}
                    : {
                        disabled: true,
                        disabledHint: isPush ? "No wallet" : "No email",
                      }),
                };
              })}
              loading={contactsQuery.isLoading}
              searchPlaceholder="Search contacts…"
              searchValue={contactSearch}
              onSearchChange={setContactSearch}
              emptyText={
                debouncedContactSearch
                  ? "No contacts match your search."
                  : "No contacts yet - import a CSV or capture a form."
              }
              footerNote={
                fetchedContacts.length >= CONTACTS_PAGE_LIMIT
                  ? `Showing the first ${CONTACTS_PAGE_LIMIT.toLocaleString()}. Search by name${isPush ? "" : " or email"} to find anyone, or send to a segment, list, or Everyone.`
                  : null
              }
              isSelected={isSelected}
              onToggle={toggleSelection}
            />
          ) : (
            <button
              type="button"
              onClick={toggleEveryone}
              className={cn(
                "flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40",
                allSelected && "bg-primary/[0.04]"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded border",
                  allSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                )}
                aria-hidden="true"
              >
                {allSelected ? <CheckIcon className="size-3.5" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  {isPush ? "Every connected wallet" : "Everyone with an email"}
                  {everyoneReachable !== null
                    ? ` · ${everyoneReachable.toLocaleString()}`
                    : ""}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {isPush
                    ? "Sends an in-app push to every wallet signed in to the app, minus the exclusions below."
                    : "Sends to every email-reachable contact, minus the exclusions below."}
                </span>
              </span>
            </button>
          )}

          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              {allSelected
                ? "Everyone selected"
                : `${tabSelected} of ${tabTotal} selected`}
              {isSyncing ? " · updating estimate…" : ""}
            </span>
            {selectedCount > 0 ? (
              <button
                type="button"
                onClick={clearSelection}
                className="font-medium text-primary hover:underline"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {isPush
            ? "Overlapping wallets are only messaged once."
            : "Overlapping contacts are only emailed once."}
        </p>

        {segmentsError ? (
          <p className="text-xs text-amber-500">
            Failed to load saved segments: {segmentsError}
          </p>
        ) : null}
        {syncError ? (
          <p className="text-xs text-amber-500">
            Failed to sync audience settings: {syncError}
          </p>
        ) : null}

        {!isPush &&
        missingEmailCount !== null &&
        missingEmailCount > 0 &&
        totalRecipientCount !== null ? (
          <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
            <ExclamationTriangleIcon
              className="size-5 shrink-0"
              aria-hidden="true"
            />
            <p>
              {`${missingEmailCount.toLocaleString()} of ${totalRecipientCount.toLocaleString()} recipient${
                totalRecipientCount === 1 ? "" : "s"
              } don't have an email address and will be skipped. `}
              Switch to <span className="font-medium">In-app push</span> to
              reach more.
            </p>
          </div>
        ) : null}

        {sendTab === "contacts" ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheckIcon
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            Recipients are matched through ZK-verified identity links. You send
            to them without their wallet identity ever being exposed to you.
          </p>
        ) : null}
      </div>

      {/* Don't send to */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          Don&apos;t send to
        </p>
        <div className="flex flex-wrap gap-2">
          {exclusions.map((ex) => (
            <button
              key={ex.key}
              type="button"
              aria-pressed={ex.applied}
              disabled={ex.locked}
              onClick={
                ex.locked ? undefined : () => setIncludeInternal((v) => !v)
              }
              title={
                ex.locked
                  ? `Always excluded - suppressed and unsubscribed ${isPush ? "wallets" : "contacts"} can't be messaged`
                  : ex.applied
                    ? `Excluded. Click to include internal / team ${isPush ? "wallets" : "contacts"}`
                    : `Included. Click to exclude internal / team ${isPush ? "wallets" : "contacts"}`
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                ex.locked && "cursor-default",
                ex.applied
                  ? "border-primary/40 bg-primary/[0.08] text-primary"
                  : "border-border bg-card text-muted-foreground line-through decoration-muted-foreground/40 hover:text-foreground"
              )}
            >
              {ex.applied ? (
                <CheckIcon className="size-4" aria-hidden="true" />
              ) : (
                <span className="size-4" aria-hidden="true" />
              )}
              {ex.label}
              {ex.count !== null ? (
                <span className="tabular-nums opacity-70">
                  · {ex.count.toLocaleString()}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Suppressed and unsubscribed wallets are always excluded, and are
          already removed from the estimate.
        </p>
      </div>

      {/* Smart sending */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Smart sending</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Skip anyone who already heard from you in the last{" "}
            {smartSendingWindow !== null
              ? `${smartSendingWindow} hours`
              : "window"}
            .
          </p>
          {smartSending ? (
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={168}
                step={1}
                value={windowOverrideDraft ?? ""}
                onChange={(e) =>
                  form.setValue("smartSendingWindowHours", e.target.value, {
                    shouldDirty: true,
                  })
                }
                placeholder={
                  smartSendingWindow !== null
                    ? String(smartSendingWindow)
                    : "10"
                }
                className="h-9 w-24 rounded-lg"
              />
              <span className="text-xs text-muted-foreground">
                hours override - blank uses the{" "}
                <Link
                  href={accountSettingsHref}
                  className="text-primary hover:underline"
                >
                  org setting
                </Link>
              </span>
            </div>
          ) : null}
        </div>
        <Switch
          checked={smartSending}
          onCheckedChange={(v) =>
            form.setValue("smartSending", v, { shouldDirty: true })
          }
        />
      </div>

      {/* UTM tracking (collapsible) */}
      <div className="rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setUtmOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            UTM tracking
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
                trackingParameters
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  trackingParameters ? "bg-emerald-500" : "bg-muted-foreground"
                )}
              />
              {trackingParameters ? "On · auto" : "Off"}
            </span>
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              utmOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>

        {utmOpen ? (
          <div className="space-y-4 border-t border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Auto-tag links with UTM parameters (source=onchainsuite,
                medium=email, campaign=id). Fill a field to override.
              </span>
              <Switch
                checked={trackingParameters}
                onCheckedChange={(v) =>
                  form.setValue("trackingParameters", v, { shouldDirty: true })
                }
              />
            </div>
            {trackingParameters ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    { name: "utmSource", label: "source", ph: "onchain_suite" },
                    { name: "utmMedium", label: "medium", ph: "email" },
                    {
                      name: "utmCampaign",
                      label: "campaign",
                      ph: "spring_launch",
                    },
                    { name: "utmTerm", label: "term", ph: "optional" },
                    { name: "utmContent", label: "content", ph: "optional" },
                  ] as const
                ).map((f) => (
                  <div
                    key={f.name}
                    className={f.name === "utmContent" ? "sm:col-span-2" : ""}
                  >
                    <label className="text-xs font-medium text-muted-foreground">
                      utm_{f.label}
                    </label>
                    <Input
                      value={form.watch(f.name) ?? ""}
                      onChange={(e) =>
                        form.setValue(f.name, e.target.value, {
                          shouldDirty: true,
                        })
                      }
                      placeholder={f.ph}
                      className="mt-1 h-9 rounded-lg"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SelectList({
  rows,
  loading = false,
  emptyText,
  searchPlaceholder,
  isSelected,
  onToggle,
  searchValue,
  onSearchChange,
  footerNote,
}: {
  rows: {
    id: string;
    title: string;
    sub?: string;
    trailing?: string;
    count?: number;
    /** Not deliverable on the current channel: dimmed + non-selectable. */
    disabled?: boolean;
    /** Short reason shown in place of the count when disabled ("No wallets"). */
    disabledHint?: string;
  }[];
  loading?: boolean;
  emptyText: React.ReactNode;
  searchPlaceholder: string;
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  /** When provided, search is controlled by the parent (server-side) and rows
   *  are shown as-is; otherwise search filters the loaded rows client-side. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  footerNote?: React.ReactNode;
}) {
  const [internalQuery, setInternalQuery] = useState("");
  const controlled = onSearchChange !== undefined;
  const query = controlled ? (searchValue ?? "") : internalQuery;
  const setQuery = controlled ? onSearchChange : setInternalQuery;
  const filtered = useMemo(() => {
    if (controlled) return rows; // server already filtered
    const q = query.trim().toLowerCase();
    if (q.length === 0) return rows;
    return rows.filter((r) =>
      [r.title, r.sub, r.trailing]
        .filter((v): v is string => typeof v === "string")
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [controlled, rows, query]);

  return (
    <div>
      <div className="relative border-b border-border">
        <MagnifyingGlassIcon
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-11 w-full bg-transparent pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
      {loading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">{emptyText}</div>
      ) : filtered.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">
          Nothing matches “{query}”.
        </div>
      ) : (
        <ul className="max-h-72 divide-y divide-border overflow-y-auto">
          {filtered.map((row) => {
            const selected = isSelected(row.id);
            // Lock only UNSELECTED unreachable rows - an already-selected row
            // stays clickable so a channel switch can't trap a selection.
            const locked = Boolean(row.disabled) && !selected;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onToggle(row.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                    selected && "bg-primary/[0.04]",
                    locked &&
                      "cursor-not-allowed opacity-45 hover:bg-transparent"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded border",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    )}
                    aria-hidden="true"
                  >
                    {selected ? <CheckIcon className="size-3.5" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {row.title}
                    </span>
                    {row.sub ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.sub}
                      </span>
                    ) : null}
                  </span>
                  {row.disabled && row.disabledHint ? (
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {row.disabledHint}
                    </span>
                  ) : row.trailing ? (
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {row.trailing}
                    </span>
                  ) : typeof row.count === "number" ? (
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {row.count.toLocaleString()}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {footerNote && !loading && rows.length > 0 ? (
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {footerNote}
        </div>
      ) : null}
    </div>
  );
}
