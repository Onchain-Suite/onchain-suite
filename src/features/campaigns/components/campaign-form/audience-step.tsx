"use client";

import {
  ArrowTrendingUpIcon,
  InformationCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { type CampaignAudienceEstimate } from "../../campaigns.service";
import {
  getEstimatedRecipientsFromSelection,
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
import { AudienceSelector, type ContactOption } from "./audience-selector";
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

export function AudienceStep({
  form,
  campaignId,
  canSync = false,
  lists = [],
  tags = [],
  segments = [],
  segmentsLoading = false,
  segmentsError,
}: AudienceStepProps) {
  const UTM_HELP_URL =
    "https://support.google.com/analytics/answer/1033863?hl=en";
  // Segments live as a tab on /intelligence, not their own route.
  const segmentsHref = PRIVATE_ROUTES.INTELLIGENCE_SEGMENTS;
  const accountSettingsHref = `${PRIVATE_ROUTES.SETTINGS}?tab=account`;
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
  const syncSequenceRef = useRef(0);

  // Individual contacts (with a real email) selectable directly — so a
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

  const selectedSegmentIds = useMemo(
    () => new Set(segments.map((segment) => segment.id)),
    [segments]
  );
  const localEstimatedRecipients = useMemo(
    () =>
      getEstimatedRecipientsFromSelection(
        selectedAudiences,
        [...profileOptions, ...tags],
        segments
      ),
    [profileOptions, tags, segments, selectedAudiences]
  );
  const unresolvedSelectionCount = useMemo(
    () =>
      selectedAudiences.filter(
        (selectedId) =>
          !profileOptions.some((p) => p.id === selectedId) &&
          !tags.some((tag) => tag.id === selectedId) &&
          !selectedSegmentIds.has(selectedId)
      ).length,
    [profileOptions, tags, selectedAudiences, selectedSegmentIds]
  );

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
    profileOptions,
    utmParams,
    windowOverride,
  });
  syncInputsRef.current = {
    selectedAudiences,
    segments,
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
      const { segmentIds, profileIds, tagNames } = partitionAudienceSelection(
        inputs.selectedAudiences,
        inputs.segments
      );
      // Tag selections expand to the tagged contacts' profile ids — the
      // backend audience contract only knows profiles + segments.
      const tagProfileIds = await resolveTagsToProfileIds(tagNames);
      const mergedProfileIds = Array.from(
        new Set([...profileIds, ...tagProfileIds])
      );
      return {
        audience: { segmentIds, profileIds: mergedProfileIds },
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
          // The budget resets every 10s — retry once after the window.
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
          <UserGroupIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground text-balance">
            Audience & Tracking
          </h2>
          <p className="text-base text-muted-foreground text-pretty">
            Define who will receive your campaign and tracking settings
          </p>
        </div>
      </div>

      {/* Audience Section */}
      <div className="space-y-6 p-4 sm:p-6 bg-muted/30 rounded-2xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserGroupIcon
              aria-hidden="true"
              className="h-5 w-5 text-foreground"
            />
            <h3 className="text-xl font-semibold text-foreground">Audience</h3>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div
              aria-busy={isSyncing}
              title={isSyncing ? "Updating estimate…" : undefined}
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-border bg-background transition-opacity ${
                isSyncing ? "opacity-50" : "opacity-100"
              }`}
            >
              <span className="text-sm font-semibold tabular-nums">
                {displayedEstimatedRecipients}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">Estimated recipients</span>
              <InformationCircleIcon aria-hidden="true" className="h-4 w-4" />
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="selectedAudiences"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Send to</FormLabel>
              <FormControl>
                <AudienceSelector
                  value={field.value}
                  onChange={field.onChange}
                  lists={lists}
                  tags={tags}
                  segments={segments}
                  contacts={contacts}
                  isSegmentsLoading={segmentsLoading}
                  isContactsLoading={contactsQuery.isLoading}
                  unresolvedSelectionCount={unresolvedSelectionCount}
                />
              </FormControl>
              <FormDescription>
                Pick individual contacts by email, or send to a tag or segment —
                named groups of contacts created in{" "}
                <Link
                  href={segmentsHref}
                  className="text-primary hover:underline"
                >
                  Intelligence → Segments
                </Link>
                . No tags ready? Just select the emails directly.
              </FormDescription>
              {segmentsError ? (
                <p className="text-sm text-amber-400">
                  Failed to load saved segments: {segmentsError}
                </p>
              ) : null}
              {syncError ? (
                <p className="text-sm text-amber-400">
                  Failed to sync audience settings: {syncError}
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Don't Send To Section */}
      <div className="space-y-4 p-4 sm:p-6 bg-muted/30 rounded-2xl border border-border">
        <Label className="text-base font-medium text-foreground">
          Don&apos;t send to
        </Label>
        <FormField
          control={form.control}
          name="smartSending"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-primary"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium cursor-pointer">
                    Run on Smart Sending
                  </FormLabel>
                </div>
                <FormDescription>
                  This campaign won&apos;t be sent to profiles who received a
                  message from you in the last{" "}
                  {smartSendingWindow !== null ? (
                    <span className="font-medium text-foreground">
                      {smartSendingWindow} hour
                      {smartSendingWindow === 1 ? "" : "s"}
                    </span>
                  ) : (
                    "suppression window"
                  )}
                  . Anyone excluded is already reflected in the estimated
                  recipient count. Change the window in{" "}
                  <Link
                    href={accountSettingsHref}
                    className="text-primary hover:underline"
                  >
                    account settings
                  </Link>
                  .
                </FormDescription>

                {field.value ? (
                  <FormField
                    control={form.control}
                    name="smartSendingWindowHours"
                    render={({ field: overrideField }) => (
                      <FormItem className="pt-3">
                        <FormLabel className="text-xs font-medium text-muted-foreground">
                          Override for this campaign (optional)
                        </FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              {...overrideField}
                              value={overrideField.value ?? ""}
                              type="number"
                              min={1}
                              max={168}
                              step={1}
                              placeholder={
                                smartSendingWindow !== null
                                  ? String(smartSendingWindow)
                                  : "10"
                              }
                              className="h-9 w-28 rounded-lg bg-card"
                            />
                          </FormControl>
                          <span className="text-xs text-muted-foreground">
                            hours — leave blank to use the org setting
                          </span>
                        </div>
                        {/* The value is only sent when it's a valid 1–168
                            integer, so say so rather than silently ignoring
                            what was typed. */}
                        {(overrideField.value ?? "").toString().trim().length >
                          0 && windowOverride === undefined ? (
                          <p className="text-xs text-amber-500">
                            Enter a whole number between 1 and 168. Until then
                            this campaign uses the org window.
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>
            </FormItem>
          )}
        />
      </div>

      {/* Tracking Section */}
      <div className="space-y-4 p-4 sm:p-6 bg-muted/30 rounded-2xl border border-border">
        <div className="flex items-center gap-2">
          <ArrowTrendingUpIcon
            aria-hidden="true"
            className="h-5 w-5 text-foreground"
          />
          <h3 className="text-xl font-semibold text-foreground">Tracking</h3>
        </div>

        <FormField
          control={form.control}
          name="trackingParameters"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-primary"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium cursor-pointer">
                    Include tracking parameters
                  </FormLabel>
                </div>
                <FormDescription>
                  Tags links in this campaign with UTM parameters so tools like
                  Google Analytics can attribute the traffic. Defaults to{" "}
                  <span className="font-mono text-xs text-foreground">
                    utm_source=onchainsuite
                  </span>
                  ,{" "}
                  <span className="font-mono text-xs text-foreground">
                    utm_medium=email
                  </span>{" "}
                  and the campaign id — fill any field below to override one.
                  Links that already carry their own UTM values are left
                  untouched, and unsubscribe links are never tagged.{" "}
                  <a
                    href={UTM_HELP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Learn more about UTM
                  </a>
                  .
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {trackingParameters ? (
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-background p-4 sm:grid-cols-2">
            {(
              [
                {
                  name: "utmSource",
                  label: "Source",
                  placeholder: "onchain_suite",
                },
                { name: "utmMedium", label: "Medium", placeholder: "email" },
                {
                  name: "utmCampaign",
                  label: "Campaign",
                  placeholder: "spring_launch",
                },
                { name: "utmTerm", label: "Term", placeholder: "optional" },
                {
                  name: "utmContent",
                  label: "Content",
                  placeholder: "optional",
                },
              ] as const
            ).map((f) => (
              <FormField
                key={f.name}
                control={form.control}
                name={f.name}
                render={({ field }) => (
                  <FormItem
                    className={f.name === "utmContent" ? "sm:col-span-2" : ""}
                  >
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      utm_{f.label.toLowerCase()}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder={f.placeholder}
                        className="h-9 rounded-lg bg-card"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
            <p className="text-[11px] leading-5 text-muted-foreground sm:col-span-2">
              Example:{" "}
              <span className="font-mono text-foreground">
                ?utm_source={(utmSource ?? "").trim() || "onchain_suite"}
                &amp;utm_medium={(utmMedium ?? "").trim() || "email"}
                {utmCampaign?.trim()
                  ? `&utm_campaign=${utmCampaign.trim()}`
                  : ""}
              </span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
