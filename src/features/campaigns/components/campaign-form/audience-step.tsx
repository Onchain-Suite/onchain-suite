"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
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

type SendTab = "segments" | "lists" | "contacts" | "everyone";

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
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sendTab, setSendTab] = useState<SendTab>("segments");
  const [utmOpen, setUtmOpen] = useState(false);
  const syncSequenceRef = useRef(0);

  // Individual contacts (with a real email) selectable directly - so a
  // campaign can be sent to specific people even with no tags/segments ready.
  const contactsQuery = useQuery({
    queryKey: ["audience", "profiles", "campaign-contacts"],
    queryFn: async () => {
      const res = await audienceService.listProfiles({ page: 1, limit: 100 });
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
          const rawEmail =
            typeof profile.email === "string" ? profile.email.trim() : "";
          if (rawEmail.length === 0 || isSyntheticWalletEmail(rawEmail)) {
            return null;
          }
          const id = typeof profile.id === "string" ? profile.id.trim() : "";
          if (id.length === 0) return null;
          const { walletFull } = extractWalletFields(profile);
          return {
            id,
            email: rawEmail,
            name: deriveDisplayName({
              name: profile.name,
              fullName: (profile as { fullName?: unknown }).fullName,
              email: rawEmail,
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
  const contacts = useMemo(
    () => contactsQuery.data ?? [],
    [contactsQuery.data]
  );

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
  const everyoneReachable = ((): number | null => {
    const pick = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) ? v : null;
    return pick(overview?.emailReachable) ?? pick(overview?.total);
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

  const allSelected = isAllContactsSelected(selectedAudiences);

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

  // Describe the chosen audience so "Estimated recipients" reads back what was
  // picked (or "Everyone" when nothing is selected).
  const chosenSummary = useMemo(() => {
    if (allSelected || selectedCount === 0) {
      return everyoneReachable !== null
        ? `Everyone: all ${everyoneReachable.toLocaleString()} reachable wallets`
        : "Everyone in your audience";
    }
    const segmentsChosen = selectedAudiences.filter((id) =>
      segments.some((s) => s.id === id)
    ).length;
    const listsChosen = selectedAudiences.filter((id) =>
      lists.some((l) => l.id === id)
    ).length;
    const contactsChosen = selectedAudiences.filter((id) =>
      contacts.some((c) => c.id === id)
    ).length;
    const parts: string[] = [];
    if (segmentsChosen)
      parts.push(`${segmentsChosen} segment${segmentsChosen === 1 ? "" : "s"}`);
    if (listsChosen)
      parts.push(`${listsChosen} list${listsChosen === 1 ? "" : "s"}`);
    if (contactsChosen)
      parts.push(`${contactsChosen} contact${contactsChosen === 1 ? "" : "s"}`);
    return parts.length > 0
      ? `Sending to ${parts.join(", ")}`
      : `${selectedCount} selected`;
  }, [
    allSelected,
    selectedCount,
    selectedAudiences,
    segments,
    lists,
    contacts,
    everyoneReachable,
  ]);

  const SEND_TABS: { key: SendTab; label: string }[] = [
    { key: "segments", label: "Segments" },
    { key: "lists", label: "Lists" },
    { key: "contacts", label: "Contacts" },
    { key: "everyone", label: "Everyone" },
  ];

  const exclusions = [
    { label: "Suppressed & unsubscribed", meta: "always", primary: true },
    {
      label: "Messaged recently",
      meta:
        smartSending && smartSendingWindow !== null
          ? `${smartSendingWindow}h`
          : "smart sending",
      primary: false,
    },
    { label: "Internal / team wallets", meta: "excluded", primary: false },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Who gets this?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the campaign type, then choose segments, lists, contacts, or
          everyone.
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
              sub: "Email · wallet optional",
            },
            {
              key: "in-app-push" as const,
              icon: DevicePhoneMobileIcon,
              title: "In-app push",
              sub: "Wallet · email optional",
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
            ? "Delivered in-app to connected wallets - email optional."
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
                count: s.count,
              }))}
              loading={segmentsLoading}
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
                count: l.count,
              }))}
              emptyText="No lists yet - save a segment or tag to reuse it."
              isSelected={isSelected}
              onToggle={toggleSelection}
            />
          ) : sendTab === "contacts" ? (
            <SelectList
              rows={contacts.map((c) => ({
                id: c.id,
                title: c.name,
                trailing: c.email,
              }))}
              loading={contactsQuery.isLoading}
              emptyText="No contacts with a verified email yet."
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
                  {everyoneReachable !== null
                    ? `Everyone: all ${everyoneReachable.toLocaleString()} reachable wallets`
                    : "Everyone in your audience"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Sends to every reachable wallet, minus the exclusions below.
                </span>
              </span>
            </button>
          )}

          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              {allSelected ? "Everyone selected" : `${selectedCount} selected`}
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

        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Estimated recipients
            </span>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {isSyncing
                ? "…"
                : displayedEstimatedRecipients !== null
                  ? displayedEstimatedRecipients.toLocaleString()
                  : "-"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {chosenSummary}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Overlapping wallets are only messaged once.
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

        {!isPush ? (
          <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
            <ExclamationTriangleIcon
              className="size-5 shrink-0"
              aria-hidden="true"
            />
            <p>
              Wallets without a verified email are skipped on email campaigns -
              switch to <span className="font-medium">In-app push</span> to
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
            <span
              key={ex.label}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
                ex.primary
                  ? "border-primary/30 bg-primary/[0.06] text-primary"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {ex.primary ? (
                <ShieldCheckIcon className="size-4" aria-hidden="true" />
              ) : null}
              {ex.label}
              <span className="text-muted-foreground/70">· {ex.meta}</span>
            </span>
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
  isSelected,
  onToggle,
}: {
  rows: {
    id: string;
    title: string;
    sub?: string;
    trailing?: string;
    count?: number;
  }[];
  loading?: boolean;
  emptyText: React.ReactNode;
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
}) {
  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }
  if (rows.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">{emptyText}</div>;
  }
  return (
    <ul className="max-h-72 divide-y divide-border overflow-y-auto">
      {rows.map((row) => {
        const selected = isSelected(row.id);
        return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onToggle(row.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
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
                {selected ? (
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
                    <path
                      d="M3.5 8.5l3 3 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
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
              {row.trailing ? (
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
  );
}
