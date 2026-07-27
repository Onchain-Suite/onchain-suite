"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ClockIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FieldErrors, UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import { Form } from "@/ui/form";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import {
  getZonedDateTimeParts,
  parseTimeOfDay,
  zonedWallTimeToUtcDate,
} from "@/lib/timezone";
import {
  cn,
  extractEmailContent,
  getSelectedOrganizationId,
  isJsonObject,
} from "@/lib/utils";

import {
  type CampaignFormData,
  campaignFormSchema,
} from "../../campaigns/validations";
import {
  audienceService,
  type AudienceTag,
} from "@/features/audience/audience.service";
import { campaignsService } from "@/features/campaigns/campaigns.service";
import { AudienceStep } from "@/features/campaigns/components/campaign-form/audience-step";
import { ConfirmationPage } from "@/features/campaigns/components/campaign-form/campaign-confirmation";
import { ScheduleSendDialog } from "@/features/campaigns/components/campaign-form/schedule-send-dialog";
import { TemplateStep } from "@/features/campaigns/components/campaign-form/template-step";
import {
  partitionAudienceSelection,
  resolveTagsToProfileIds,
  tagSelectionId,
} from "@/features/campaigns/lib/audience";
import {
  isRateLimitError,
  syncAudienceSettings,
} from "@/features/campaigns/lib/audience-sync";
import { parseSenderNotVerified } from "@/features/campaigns/lib/launch-errors";
import type { List, Segment } from "@/features/campaigns/types";
import {
  type IntelligenceSegment,
  intelligenceService,
} from "@/features/intelligence/intelligence.service";
import { senderIdentitiesService } from "@/features/settings/sender-identities.service";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";
import { useActiveTimezone } from "@/shared/hooks/client/use-timezones";

// Steps: 1 Audience → 2 Template & message → 3 Preview & send. Campaign
// name/type are collected up front in the create-campaign sheet, and send
// timing (now vs schedule) is chosen on the template step.
const TOTAL_STEPS = 3;
/**
 * Domain verification lives in the account tab's "Sender verification"
 * section, which is collapsed by default — `section=` expands and scrolls to
 * it so the link lands on the thing the user was told to do.
 */
const SENDER_VERIFICATION_HREF = `${PRIVATE_ROUTES.SETTINGS}?tab=account&section=sender-verification`;
const campaignTypes = new Set<CampaignFormData["campaignType"]>([
  "email-blast",
  "smart-sending",
  "newsletter",
  "promotional",
  "announcement",
  "automation",
]);
const sendOptions = new Set<CampaignFormData["sendOption"]>([
  "now",
  "schedule",
]);

interface OrganizationMemberPermissions {
  canManageMembers: boolean;
  canManageSenderIdentities: boolean;
  canEditCampaigns: boolean;
  canSendEmail: boolean;
  canLaunchCampaigns: boolean;
  canViewSettings: boolean;
}

interface CurrentMemberAccess {
  id: string;
  email: string;
  roleLabel: string;
  isEnabled: boolean;
  permissions?: OrganizationMemberPermissions;
}

const unwrapData = (payload: unknown): unknown => {
  if (isJsonObject(payload) && "data" in payload) {
    return payload.data ?? payload;
  }
  return payload;
};

const toArray = (payload: unknown): unknown[] => {
  const root = unwrapData(payload);
  if (Array.isArray(root)) return root;
  if (isJsonObject(root) && Array.isArray(root.items)) return root.items;
  if (isJsonObject(root) && Array.isArray(root.data)) return root.data;
  return [];
};

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const pickBooleanLike = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (value === 1) return true;
      if (value === 0) return false;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (
        [
          "true",
          "1",
          "yes",
          "enabled",
          "active",
          "verified",
          "default",
        ].includes(normalized)
      ) {
        return true;
      }
      if (
        [
          "false",
          "0",
          "no",
          "disabled",
          "inactive",
          "pending",
          "failed",
        ].includes(normalized)
      ) {
        return false;
      }
    }
  }
  return undefined;
};

const toCampaignSegment = (value: unknown): Segment | null => {
  if (!isJsonObject(value)) return null;
  const id = pickString(value.id);
  const name = pickString(value.name, value.title, value.label);
  if (!id || !name) return null;

  return {
    id,
    name,
    count:
      typeof value.count === "number"
        ? value.count
        : typeof value.totalProfiles === "number"
          ? value.totalProfiles
          : 0,
    starred: Boolean(value.starred ?? value.isStarred ?? false),
  };
};

const normalizeIntelligenceSegments = (
  payload: unknown
): IntelligenceSegment[] => {
  const root = unwrapData(payload);
  if (Array.isArray(root)) return root as IntelligenceSegment[];
  if (isJsonObject(root) && Array.isArray(root.items)) {
    return root.items as IntelligenceSegment[];
  }
  if (isJsonObject(root) && Array.isArray(root.data)) {
    return root.data as IntelligenceSegment[];
  }
  return [];
};

const normalizeMemberPermissions = (
  payload: unknown
): OrganizationMemberPermissions | undefined => {
  if (!isJsonObject(payload)) return undefined;
  return {
    canManageMembers: pickBooleanLike(payload.canManageMembers) ?? false,
    canManageSenderIdentities:
      pickBooleanLike(payload.canManageSenderIdentities) ?? false,
    canEditCampaigns: pickBooleanLike(payload.canEditCampaigns) ?? false,
    canSendEmail: pickBooleanLike(payload.canSendEmail) ?? false,
    canLaunchCampaigns: pickBooleanLike(payload.canLaunchCampaigns) ?? false,
    canViewSettings: pickBooleanLike(payload.canViewSettings) ?? false,
  };
};

const normalizeCurrentMemberAccess = (
  payload: unknown,
  sessionUser: { email?: string | null; id?: string | null } | undefined
): CurrentMemberAccess | null => {
  const sessionEmail = sessionUser?.email?.trim().toLowerCase();
  const sessionUserId = sessionUser?.id?.trim();

  if (!sessionEmail && !sessionUserId) return null;

  for (const entry of toArray(payload)) {
    if (!isJsonObject(entry)) continue;
    const email = pickString(entry.email, entry.userEmail)?.toLowerCase();
    const id = pickString(entry.userId, entry.id);
    const matchesEmail = Boolean(sessionEmail && email === sessionEmail);
    const matchesId = Boolean(sessionUserId && id === sessionUserId);
    if (!matchesEmail && !matchesId) continue;

    return {
      id: id ?? email ?? "current-member",
      email: email ?? sessionEmail ?? "",
      roleLabel:
        pickString(entry.roleLabel, entry.role, entry.roleName) ?? "Viewer",
      isEnabled:
        pickBooleanLike(entry.isEnabled, entry.enabled, entry.active) ?? true,
      permissions: normalizeMemberPermissions(entry.permissions),
    };
  }

  return null;
};

const asCampaignType = (
  value: unknown
): CampaignFormData["campaignType"] | undefined => {
  if (typeof value !== "string") return undefined;
  return campaignTypes.has(value as CampaignFormData["campaignType"])
    ? (value as CampaignFormData["campaignType"])
    : undefined;
};

const asSendOption = (
  value: unknown
): CampaignFormData["sendOption"] | undefined => {
  if (typeof value !== "string") return undefined;
  return sendOptions.has(value as CampaignFormData["sendOption"])
    ? (value as CampaignFormData["sendOption"])
    : undefined;
};

/**
 * srcDoc email preview that grows to the rendered email's height (about:srcdoc
 * iframes are same-origin, so the content document is measurable) — the page
 * scrolls naturally instead of trapping the email in a short inner scroller.
 */
function EmailPreviewFrame({ html }: { html: string }) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(600);
  const measure = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    const next = Math.max(
      doc.body?.scrollHeight ?? 0,
      doc.documentElement?.scrollHeight ?? 0
    );
    if (next > 0) setHeight(Math.min(Math.max(next + 16, 420), 6000));
  }, []);
  return (
    <iframe
      ref={frameRef}
      title="Email HTML preview"
      srcDoc={html}
      onLoad={measure}
      className="w-full bg-white"
      style={{ border: "none", height }}
    />
  );
}

function CampaignPreviewStep({
  form,
  campaignId,
  canLaunch,
}: {
  form: UseFormReturn<CampaignFormData>;
  campaignId?: string;
  canLaunch: boolean;
}) {
  const [tab, setTab] = useState<"html" | "text">("html");

  const normalizedCampaignId = useMemo(() => {
    return campaignId && campaignId.trim().length > 0 ? campaignId.trim() : "";
  }, [campaignId]);

  const getRenderRequest = () => {
    const values = form.getValues();
    const subject = values.emailSubject?.trim();
    const previewText = values.previewText?.trim();
    const senderName = values.senderName?.trim();
    const senderEmail = values.senderEmail?.trim();
    const replyToEmail = values.replyToEmail?.trim();

    return {
      subject: subject && subject.length > 0 ? subject : undefined,
      previewText:
        previewText && previewText.length > 0 ? previewText : undefined,
      senderName: senderName && senderName.length > 0 ? senderName : undefined,
      senderEmail:
        senderEmail && senderEmail.length > 0 ? senderEmail : undefined,
      replyToEmail:
        values.useReplyTo && replyToEmail && replyToEmail.length > 0
          ? replyToEmail
          : undefined,
    };
  };

  const extractMissingFields = (payload: unknown): string[] => {
    const candidates = [
      payload,
      isJsonObject(payload) ? payload.data : undefined,
    ];
    for (const candidate of candidates) {
      if (isJsonObject(candidate) && Array.isArray(candidate.missingFields)) {
        return candidate.missingFields.filter(
          (f): f is string => typeof f === "string" && f.length > 0
        );
      }
    }
    return [];
  };

  const getCanonicalPreview = async () => {
    if (!normalizedCampaignId) throw new Error("Missing campaign id.");
    const preview = await campaignsService.preview(
      normalizedCampaignId,
      getRenderRequest()
    );
    const extracted = extractEmailContent(preview);
    if (
      (extracted.html?.trim().length ?? 0) > 0 ||
      (extracted.textVersion?.trim().length ?? 0) > 0
    ) {
      return {
        html: extracted.html ?? "",
        text: extracted.textVersion ?? "",
        missingFields: extractMissingFields(preview),
      };
    }

    try {
      const email =
        await campaignsService.getEmailContent(normalizedCampaignId);
      const extracted = extractEmailContent(email);
      if (
        (extracted.html?.trim().length ?? 0) > 0 ||
        (extracted.textVersion?.trim().length ?? 0) > 0
      ) {
        return {
          html: extracted.html ?? "",
          text: extracted.textVersion ?? "",
          missingFields: [] as string[],
        };
      }
    } catch (_e) {
      String(_e);
    }
    throw new Error(
      "This campaign has no rendered email content yet. Save or regenerate the email before launch."
    );
  };

  const selectedTemplateId = form.watch("selectedTemplate") ?? "";
  const isPush = form.watch("channel") === "in-app-push";

  // Auto-load the rendered email as soon as the step opens — no manual
  // "Generate preview" click required. The selected template is part of the
  // key so re-selecting a template invalidates the cached render.
  const previewQuery = useQuery({
    queryKey: [
      "campaigns",
      "preview",
      normalizedCampaignId,
      selectedTemplateId,
    ],
    queryFn: getCanonicalPreview,
    enabled: normalizedCampaignId.length > 0 && !isPush,
    retry: false,
  });

  // Push campaigns have no rendered email — preview the saved push variant
  // instead (GET /campaigns/{id}/editor/content returns `push`).
  const pushPreviewQuery = useQuery({
    queryKey: [
      "campaigns",
      "push-preview",
      normalizedCampaignId,
      selectedTemplateId,
    ],
    queryFn: () => campaignsService.getEditorContent(normalizedCampaignId),
    enabled: normalizedCampaignId.length > 0 && isPush,
    retry: false,
  });

  const pushPreview = useMemo(() => {
    const raw = pushPreviewQuery.data as unknown;
    const obj = isJsonObject(raw) ? raw : {};
    const push = isJsonObject(obj.push) ? obj.push : null;
    if (!push) return null;
    const title = typeof push.title === "string" ? push.title : "";
    const body = typeof push.body === "string" ? push.body : "";
    if (title.trim().length === 0 && body.trim().length === 0) return null;
    return {
      title,
      body,
      ctaLabel: typeof push.ctaLabel === "string" ? push.ctaLabel : "",
    };
  }, [pushPreviewQuery.data]);

  const previewHtml = previewQuery.data?.html ?? "";
  const previewText = previewQuery.data?.text ?? "";
  const previewMissingFields = previewQuery.data?.missingFields ?? [];
  const previewErrorMessage =
    previewQuery.error instanceof Error
      ? previewQuery.error.message
      : "Failed to generate preview.";
  const { isSubmitting } = form.formState;

  const values = form.watch();
  const isScheduled = values.sendOption === "schedule";
  const timezone =
    typeof values.timezone === "string" && values.timezone.length > 0
      ? values.timezone
      : "UTC";

  const scheduleLabel = useMemo(() => {
    if (!isScheduled) return "Send now";
    if (!values.scheduleDate || !values.scheduleTime) return "Schedule (—)";
    const { hour, minute } = parseTimeOfDay(values.scheduleTime);
    const utc = zonedWallTimeToUtcDate(
      {
        year: values.scheduleDate.getFullYear(),
        month: values.scheduleDate.getMonth() + 1,
        day: values.scheduleDate.getDate(),
        hour,
        minute,
      },
      timezone
    );
    const dt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(utc);
    return `Schedule (${dt} ${timezone})`;
  }, [isScheduled, timezone, values.scheduleDate, values.scheduleTime]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground text-balance">
          Preview campaign
        </h2>
        <p className="text-base text-muted-foreground text-pretty">
          {isPush
            ? "Here is the push notification your audience will receive. Review the details, then send it on its way."
            : "Here is the email your audience will receive. Review the details, then send it on its way."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-sm font-medium text-foreground">Summary</div>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div>
                <span className="text-foreground">Campaign:</span>{" "}
                {values.campaignName || "Untitled"}
              </div>
              <div>
                <span className="text-foreground">Type:</span>{" "}
                {values.campaignType}
              </div>
              <div>
                <span className="text-foreground">Subject:</span>{" "}
                {values.emailSubject || "—"}
              </div>
              {!isPush ? (
                <div>
                  <span className="text-foreground">From:</span>{" "}
                  {values.senderName ? `${values.senderName} ` : ""}
                  {(values.senderEmail ?? "").trim() || "—"}
                </div>
              ) : (
                <div>
                  <span className="text-foreground">Channel:</span> In-app Push
                </div>
              )}
              <div>
                <span className="text-foreground">Send:</span> {scheduleLabel}
              </div>
              <div>
                <span className="text-foreground">Template:</span>{" "}
                {values.selectedTemplate && values.selectedTemplate.length > 0
                  ? values.selectedTemplate
                  : "—"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            {!canLaunch ? (
              <p className="mb-3 text-xs text-muted-foreground">
                Your role cannot launch campaigns for this organization.
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={!normalizedCampaignId || !canLaunch || isSubmitting}
              className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <ArrowPathIcon
                    aria-hidden="true"
                    className="mr-2 h-4 w-4 animate-spin"
                  />
                  {isScheduled ? "Scheduling…" : "Sending…"}
                </>
              ) : (
                <>
                  {isPush
                    ? "Send push now"
                    : isScheduled
                      ? "Schedule campaign"
                      : "Send campaign now"}
                  {isScheduled && !isPush ? (
                    <ClockIcon aria-hidden="true" className="ml-2 h-4 w-4" />
                  ) : (
                    <PaperAirplaneIcon
                      aria-hidden="true"
                      className="ml-2 h-4 w-4"
                    />
                  )}
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {isPush
                ? "Sends immediately to wallet-reachable contacts."
                : isScheduled
                  ? scheduleLabel
                  : "Delivery starts immediately."}
            </p>
          </div>

          {!isPush && previewMissingFields.length > 0 ? (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
              <div className="text-sm font-medium text-foreground">
                {previewMissingFields.length} merge variable
                {previewMissingFields.length > 1 ? "s" : ""} won&apos;t resolve
                for this audience
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The send will be blocked until these have values or fallbacks:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {previewMissingFields.map((field) => (
                  <span
                    key={field}
                    className="rounded-full bg-background px-2 py-0.5 font-mono text-[11px] text-foreground ring-1 ring-border"
                  >
                    {`{{ ${field} }}`}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Edit the template and add a fallback — e.g.{" "}
                <span className="font-mono">
                  {'{{ ens_name | default: "there" }}'}
                </span>{" "}
                — or switch to a wallet-aware token like{" "}
                <span className="font-mono">{"{{ greeting_name }}"}</span>,
                which never renders blank.
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-medium text-foreground">
              {isPush ? "Push preview" : "Email preview"}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isPush ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant={tab === "html" ? "default" : "outline"}
                    className="rounded-xl"
                    onClick={() => setTab("html")}
                  >
                    HTML
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={tab === "text" ? "default" : "outline"}
                    className="rounded-xl"
                    onClick={() => setTab("text")}
                  >
                    Plain text
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={
                  !normalizedCampaignId ||
                  (isPush
                    ? pushPreviewQuery.isFetching
                    : previewQuery.isFetching)
                }
                onClick={() =>
                  isPush ? pushPreviewQuery.refetch() : previewQuery.refetch()
                }
              >
                <ArrowPathIcon
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4",
                    (isPush
                      ? pushPreviewQuery.isFetching
                      : previewQuery.isFetching) && "animate-spin"
                  )}
                />
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            {!normalizedCampaignId ? (
              <div className="flex min-h-[420px] items-center justify-center bg-card p-6 text-center text-sm text-muted-foreground">
                Missing campaign id.
              </div>
            ) : isPush ? (
              pushPreviewQuery.isLoading ? (
                <div
                  className="flex min-h-[420px] animate-pulse flex-col items-center justify-center gap-3 bg-card p-6"
                  aria-hidden="true"
                >
                  <div className="h-24 w-full max-w-sm rounded-xl bg-muted" />
                </div>
              ) : pushPreview ? (
                <div className="flex min-h-[420px] items-center justify-center bg-muted/30 p-6">
                  {/* Mock in-app notification card */}
                  <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-lg">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                        <PaperAirplaneIcon
                          aria-hidden="true"
                          className="h-5 w-5"
                        />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-sm font-semibold text-foreground">
                          {pushPreview.title || "(no title)"}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {pushPreview.body || "(no body)"}
                        </p>
                        {pushPreview.ctaLabel ? (
                          <div className="pt-2">
                            <span className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                              {pushPreview.ctaLabel}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[420px] items-center justify-center bg-card p-6 text-center">
                  <div className="max-w-md space-y-2">
                    <div className="text-sm font-medium text-foreground">
                      No push content yet
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Select a push template on the previous step (or author
                      push content in the editor), then refresh.
                    </div>
                  </div>
                </div>
              )
            ) : previewQuery.isLoading ? (
              <div
                className="flex min-h-[420px] animate-pulse flex-col gap-3 bg-card p-6"
                aria-hidden="true"
              >
                <div className="h-6 w-1/3 rounded-md bg-muted" />
                <div className="h-40 rounded-md bg-muted" />
                <div className="h-4 w-2/3 rounded-md bg-muted" />
                <div className="h-4 w-1/2 rounded-md bg-muted" />
                <div className="flex-1 rounded-md bg-muted" />
              </div>
            ) : previewQuery.isError ? (
              <div className="flex min-h-[420px] items-center justify-center bg-card p-6 text-center">
                <div className="max-w-md space-y-3">
                  <div className="text-sm font-medium text-foreground">
                    Preview unavailable
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {previewErrorMessage}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => previewQuery.refetch()}
                  >
                    Try again
                  </Button>
                </div>
              </div>
            ) : tab === "html" ? (
              previewHtml.trim().length > 0 ? (
                <EmailPreviewFrame html={previewHtml} />
              ) : (
                <div className="flex min-h-[420px] items-center justify-center bg-card p-6 text-center">
                  <div className="max-w-md space-y-2">
                    <div className="text-sm font-medium text-foreground">
                      No HTML preview available
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Select a template (or save content in the editor), then
                      refresh the preview.
                    </div>
                  </div>
                </div>
              )
            ) : (
              <pre className="max-h-[75vh] min-h-[420px] overflow-auto bg-muted p-4 text-sm text-foreground whitespace-pre-wrap">
                {previewText.length > 0
                  ? previewText
                  : "No text preview available."}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CreateCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { timezone: activeTimezone } = useActiveTimezone();
  const { data: session } = authClient.useSession();
  const safeSearchParams = useMemo(
    () => searchParams ?? new URLSearchParams(),
    [searchParams]
  );
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const initialStep = useMemo(() => {
    const raw = Number(safeSearchParams.get("step") ?? "1");
    if (!Number.isFinite(raw)) return 1;
    return Math.min(TOTAL_STEPS, Math.max(1, Math.trunc(raw)));
  }, [safeSearchParams]);

  const initialCampaignFromUrl = useMemo(() => {
    const raw = safeSearchParams.get("campaign");
    return raw && raw.trim().length > 0 ? raw.trim() : undefined;
  }, [safeSearchParams]);

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [campaignId, setCampaignId] = useState<string | undefined>(
    initialCampaignFromUrl
  );
  const [isBootstrappingCampaign, setIsBootstrappingCampaign] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isHydratingCampaign, setIsHydratingCampaign] = useState(false);
  const [hasHydratedCampaign, setHasHydratedCampaign] = useState(false);

  const campaignIdRef = useRef<string | undefined>(campaignId);
  const currentStepRef = useRef<number>(currentStep);
  const isHydratingRef = useRef<boolean>(isHydratingCampaign);
  const isBootstrappingRef = useRef<boolean>(isBootstrappingCampaign);
  const isBootstrappingInFlightRef = useRef<boolean>(false);
  const lastAutosavePayloadRef = useRef<string>("");

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      campaignName: "",
      campaignType: "email-blast",
      channel: "email",
      selectedAudiences: [],
      smartSending: true,
      smartSendingWindowHours: "",
      trackingParameters: true,
      utmSource: "onchain_suite",
      utmMedium: "email",
      utmCampaign: "",
      utmTerm: "",
      utmContent: "",
      selectedTemplate: "",
      emailSubject: "",
      previewText: "",
      senderName: "",
      senderEmail: "",
      useReplyTo: true,
      replyToEmail: "",
      sendOption: "now",
      scheduleTime: "09:00",
      timezone: "UTC",
    },
  });

  useEffect(() => {
    const syncSelectedOrgId = () => {
      setSelectedOrgId(getSelectedOrganizationId());
    };

    syncSelectedOrgId();
    window.addEventListener("onchain:org-changed", syncSelectedOrgId);
    return () =>
      window.removeEventListener("onchain:org-changed", syncSelectedOrgId);
  }, []);

  const organizationId = useMemo(() => {
    const selected = selectedOrgId?.trim();
    if (selected) return selected;
    const active = session?.session?.activeOrganizationId;
    return typeof active === "string" && active.trim().length > 0
      ? active.trim()
      : null;
  }, [selectedOrgId, session?.session?.activeOrganizationId]);

  const orgHeaders = useMemo(
    () =>
      organizationId
        ? {
            "x-org-id": organizationId,
            "x-onchain-silent-error": "1",
          }
        : undefined,
    [organizationId]
  );

  const senderIdentitiesQuery = useQuery({
    queryKey: ["campaigns", "sender-identities", organizationId],
    enabled: Boolean(organizationId),
    retry: false,
    queryFn: () =>
      senderIdentitiesService.listSenderIdentities(organizationId ?? undefined),
  });

  const currentMemberAccessQuery = useQuery({
    queryKey: ["campaigns", "member-access", organizationId, session?.user?.id],
    enabled: Boolean(organizationId && orgHeaders),
    retry: false,
    queryFn: async () => {
      const response = await apiClient.get(
        `/organizations/${organizationId}/members`,
        {
          headers: orgHeaders,
        }
      );
      return normalizeCurrentMemberAccess(response.data, {
        email: session?.user?.email ?? null,
        id:
          typeof session?.user?.id === "string"
            ? session.user.id
            : typeof session?.session?.userId === "string"
              ? session.session.userId
              : null,
      });
    },
  });

  const audienceSegmentsQuery = useQuery({
    queryKey: ["intelligence", "segments", "campaign-form"],
    queryFn: async () => {
      const response = await intelligenceService.listSegments({ limit: 100 });
      const items = normalizeIntelligenceSegments(response);
      return items
        .map(toCampaignSegment)
        .filter((item): item is Segment => !!item);
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  // Audience tags are offered in the picker as `tag:<name>` selections and
  // expanded to profileIds at save time (the backend audience contract only
  // knows profiles + segments).
  const audienceTagsQuery = useQuery({
    queryKey: ["audience", "tags", "campaign-form"],
    queryFn: async () => {
      const res = await audienceService.listTags();
      const rows: unknown[] = Array.isArray(res)
        ? res
        : (res.items ?? res.data ?? []);
      return rows
        .filter(
          (t): t is AudienceTag =>
            isJsonObject(t) && typeof t.name === "string" && t.name.length > 0
        )
        .map((t): List => ({
          id: tagSelectionId(t.name),
          name: t.name,
          count:
            typeof t.count === "number"
              ? t.count
              : typeof t.profileCount === "number"
                ? t.profileCount
                : typeof t.countProfiles === "number"
                  ? t.countProfiles
                  : 0,
          starred: false,
        }));
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const verifiedSenderIdentities = useMemo(
    () =>
      (senderIdentitiesQuery.data ?? []).filter(
        (identity) => identity.status === "verified"
      ),
    [senderIdentitiesQuery.data]
  );

  const currentMemberAccess = currentMemberAccessQuery.data;
  const canSendEmail =
    currentMemberAccess?.isEnabled === false
      ? false
      : currentMemberAccess?.permissions?.canSendEmail !== false;
  const canLaunchCampaigns =
    currentMemberAccess?.isEnabled === false
      ? false
      : currentMemberAccess?.permissions?.canLaunchCampaigns !== false;

  useEffect(() => {
    const currentSenderEmail = (form.getValues("senderEmail") ?? "").trim();
    if (currentSenderEmail.length > 0) return;
    if (verifiedSenderIdentities.length === 0) return;

    const preferredSender =
      verifiedSenderIdentities.find((identity) => identity.isDefault) ??
      verifiedSenderIdentities[0];
    if (!preferredSender) return;

    form.setValue("senderEmail", preferredSender.email, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });

    const currentSenderName = (form.getValues("senderName") ?? "").trim();
    if (currentSenderName.length === 0) {
      form.setValue("senderName", preferredSender.name, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [form, verifiedSenderIdentities]);

  useEffect(() => {
    const current = form.getValues("timezone");
    if (current === activeTimezone) return;
    form.setValue("timezone", activeTimezone, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [activeTimezone, form]);

  const computeScheduleUtcIso = useCallback(
    (data: CampaignFormData): string | undefined => {
      if (data.sendOption !== "schedule") return undefined;
      if (!(data.scheduleDate instanceof Date)) return undefined;
      if (
        typeof data.scheduleTime !== "string" ||
        data.scheduleTime.length === 0
      )
        return undefined;
      const tz =
        typeof data.timezone === "string" && data.timezone.trim().length > 0
          ? data.timezone.trim()
          : activeTimezone;
      const { hour, minute } = parseTimeOfDay(data.scheduleTime);
      const utc = zonedWallTimeToUtcDate(
        {
          year: data.scheduleDate.getFullYear(),
          month: data.scheduleDate.getMonth() + 1,
          day: data.scheduleDate.getDate(),
          hour,
          minute,
        },
        tz
      );
      return utc.toISOString();
    },
    [activeTimezone]
  );

  useEffect(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    campaignIdRef.current = campaignId;
  }, [campaignId]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    isHydratingRef.current = isHydratingCampaign;
  }, [isHydratingCampaign]);

  useEffect(() => {
    isBootstrappingRef.current = isBootstrappingCampaign;
  }, [isBootstrappingCampaign]);

  useEffect(() => {
    const ensureCampaign = async () => {
      if (campaignIdRef.current) return;
      if (isBootstrappingInFlightRef.current) return;
      if (bootstrapError) return;

      isBootstrappingInFlightRef.current = true;
      setIsBootstrappingCampaign(true);
      setBootstrapError(null);
      try {
        const created = await campaignsService.createCampaign({
          name: "Untitled campaign",
          type: form.getValues("campaignType"),
          status: "draft",
        });
        if (!created?.id) throw new Error("Failed to create campaign draft");
        setCampaignId(created.id);

        const next = new URLSearchParams(safeSearchParams.toString());
        next.set("campaign", created.id);
        next.set("step", String(currentStepRef.current));
        router.replace(`/campaigns/new?${next.toString()}`);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to create campaign";
        setBootstrapError(message);
        toast.error(message);
      } finally {
        setIsBootstrappingCampaign(false);
        isBootstrappingInFlightRef.current = false;
      }
    };

    ensureCampaign().catch(() => undefined);
  }, [bootstrapError, form, router, safeSearchParams]);

  useEffect(() => {
    const hydrate = async () => {
      if (!campaignId) return;
      if (hasHydratedCampaign) return;

      if (!initialCampaignFromUrl) {
        setHasHydratedCampaign(true);
        return;
      }

      setIsHydratingCampaign(true);
      try {
        const [campaignRes, contentRes, audienceRes, trackingRes, scheduleRes] =
          await Promise.allSettled([
            campaignsService.getCampaign(campaignId),
            campaignsService.getContent(campaignId),
            campaignsService.getAudience(campaignId),
            campaignsService.getTracking(campaignId),
            campaignsService.getSchedule(campaignId),
          ]);

        const nextValues: Partial<CampaignFormData> = {};

        if (campaignRes.status === "fulfilled") {
          const cObj: Record<string, unknown> = isJsonObject(campaignRes.value)
            ? campaignRes.value
            : {};
          const { name: campaignName, type, templateId } = cObj;
          if (typeof campaignName === "string" && campaignName.length > 0) {
            nextValues.campaignName = campaignName;
          }
          const campaignType = asCampaignType(type);
          if (campaignType) nextValues.campaignType = campaignType;
          if (typeof templateId === "string") {
            nextValues.selectedTemplate = templateId;
          }
        }

        if (contentRes.status === "fulfilled") {
          const cObj: Record<string, unknown> = isJsonObject(contentRes.value)
            ? contentRes.value
            : {};
          const {
            subject,
            previewText,
            senderName,
            senderEmail,
            replyToEmail,
          } = cObj;
          if (typeof subject === "string" || subject === null) {
            nextValues.emailSubject = String(subject ?? "");
          }
          if (typeof previewText === "string" || previewText === null) {
            nextValues.previewText = String(previewText ?? "");
          }
          if (typeof senderName === "string" || senderName === null) {
            nextValues.senderName = String(senderName ?? "");
          }
          if (typeof senderEmail === "string" || senderEmail === null) {
            nextValues.senderEmail = String(senderEmail ?? "");
          }
          if ("replyToEmail" in cObj) {
            const reply = typeof replyToEmail === "string" ? replyToEmail : "";
            nextValues.replyToEmail = reply;
            nextValues.useReplyTo = reply.length > 0;
          }
        }

        if (audienceRes.status === "fulfilled") {
          const aObj: Record<string, unknown> = isJsonObject(audienceRes.value)
            ? audienceRes.value
            : {};
          // GET /campaigns/{id}/audience returns { profileIds, segmentIds }.
          // Reading only listIds meant a saved contact selection never
          // hydrated, so reopening a campaign showed an empty audience — and
          // the next Continue saved that emptiness back over it. listIds is
          // kept purely as a fallback for anything persisted by older builds.
          const {
            profileIds: profileIdsRaw,
            listIds: listIdsRaw,
            segmentIds: segmentIdsRaw,
          } = aObj;
          const toIds = (value: unknown) =>
            Array.isArray(value) ? value.map(String) : [];
          const profileIds = [...toIds(profileIdsRaw), ...toIds(listIdsRaw)];
          const segmentIds = toIds(segmentIdsRaw);
          if (profileIds.length || segmentIds.length) {
            nextValues.selectedAudiences = Array.from(
              new Set([...profileIds, ...segmentIds])
            );
          }
        }

        if (trackingRes.status === "fulfilled") {
          const tObj: Record<string, unknown> = isJsonObject(trackingRes.value)
            ? trackingRes.value
            : {};
          const { smartSending, trackingParameters, utm } = tObj;
          if (typeof smartSending === "boolean") {
            nextValues.smartSending = smartSending;
          }
          // GET /campaigns/{id}/tracking echoes the per-campaign override.
          if (typeof tObj.smartSendingWindowHours === "number") {
            nextValues.smartSendingWindowHours = String(
              tObj.smartSendingWindowHours
            );
          }
          if (typeof trackingParameters === "boolean") {
            nextValues.trackingParameters = trackingParameters;
          }
          if (isJsonObject(utm)) {
            const utmStr = (value: unknown) =>
              typeof value === "string" ? value : undefined;
            const source = utmStr(utm.source);
            const medium = utmStr(utm.medium);
            const campaign = utmStr(utm.campaign);
            const term = utmStr(utm.term);
            const content = utmStr(utm.content);
            if (source !== undefined) nextValues.utmSource = source;
            if (medium !== undefined) nextValues.utmMedium = medium;
            if (campaign !== undefined) nextValues.utmCampaign = campaign;
            if (term !== undefined) nextValues.utmTerm = term;
            if (content !== undefined) nextValues.utmContent = content;
          }
        }

        if (scheduleRes.status === "fulfilled") {
          const sObj: Record<string, unknown> = isJsonObject(scheduleRes.value)
            ? scheduleRes.value
            : {};
          const { sendOption: sendOptionRaw, scheduleDate } = sObj;
          const sendOption = asSendOption(sendOptionRaw);
          if (sendOption) nextValues.sendOption = sendOption;
          if (typeof scheduleDate === "string") {
            const parsed = new Date(scheduleDate);
            if (!Number.isNaN(parsed.getTime())) {
              const tz = activeTimezone;
              const parts = getZonedDateTimeParts(parsed, tz);
              nextValues.timezone = tz;
              nextValues.scheduleDate = new Date(
                parts.year,
                parts.month - 1,
                parts.day
              );
              nextValues.scheduleTime = `${String(parts.hour).padStart(
                2,
                "0"
              )}:${String(parts.minute).padStart(2, "0")}`;
            }
          }
        }

        if (Object.keys(nextValues).length > 0) {
          form.reset({ ...form.getValues(), ...nextValues });
        }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to load campaign";
        toast.error(message);
      } finally {
        setHasHydratedCampaign(true);
        setIsHydratingCampaign(false);
      }
    };

    hydrate().catch(() => undefined);
  }, [
    activeTimezone,
    campaignId,
    form,
    hasHydratedCampaign,
    initialCampaignFromUrl,
  ]);

  useEffect(() => {
    if (!campaignId) return;

    const interval = setInterval(() => {
      const id = campaignIdRef.current;
      if (!id) return;
      if (isHydratingRef.current) return;
      if (isBootstrappingRef.current) return;

      const values = form.getValues();
      const scheduleDateIso = computeScheduleUtcIso(values);

      const payload = {
        step: currentStepRef.current,
        ...values,
        scheduleDate: scheduleDateIso,
      };

      const serialized = JSON.stringify(payload);
      if (serialized === lastAutosavePayloadRef.current) return;
      lastAutosavePayloadRef.current = serialized;

      campaignsService.autosaveCampaign(id, payload).catch(() => undefined);
    }, 15000);

    return () => clearInterval(interval);
  }, [campaignId, computeScheduleUtcIso, form]);

  useEffect(() => {
    const subject = safeSearchParams.get("subject");
    const senderName = safeSearchParams.get("senderName");
    const senderEmail = safeSearchParams.get("senderEmail");
    const name = safeSearchParams.get("name");
    const channel = safeSearchParams.get("channel");

    if (subject) form.setValue("emailSubject", subject);
    if (senderName) form.setValue("senderName", senderName);
    if (senderEmail) form.setValue("senderEmail", senderEmail);
    if (name) form.setValue("campaignName", name);
    if (channel === "email" || channel === "in-app-push") {
      form.setValue("channel", channel);
    }
  }, [form, safeSearchParams]);

  const syncUrlStep = (nextStep: number) => {
    const next = new URLSearchParams(safeSearchParams.toString());
    next.set("step", String(nextStep));
    if (campaignId) next.set("campaign", campaignId);
    router.replace(`/campaigns/new?${next.toString()}`);
  };

  const handleNext = async () => {
    let fieldsToValidate: (keyof CampaignFormData)[] = [];

    // Define which fields to validate for each step. Push campaigns have no
    // sender identity, so only the subject (push title) applies on step 2.
    switch (currentStep) {
      case 1:
        fieldsToValidate = ["selectedAudiences"];
        break;
      case 2:
        fieldsToValidate =
          form.getValues("channel") === "in-app-push"
            ? ["emailSubject"]
            : ["emailSubject", "senderName", "senderEmail"];
        break;
      case 3:
        fieldsToValidate = [];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate);

    if (!isValid) return;
    if (!campaignId) {
      if (bootstrapError) {
        toast.error(bootstrapError);
        return;
      }
      toast.error("Campaign is still being created. Try again in a moment.");
      return;
    }

    try {
      if (currentStep === 1) {
        const data = form.getValues();
        const { segmentIds, profileIds, tagNames } = partitionAudienceSelection(
          data.selectedAudiences,
          audienceSegmentsQuery.data ?? []
        );
        const tagProfileIds = await resolveTagsToProfileIds(tagNames);
        const mergedProfileIds = Array.from(
          new Set([...profileIds, ...tagProfileIds])
        );
        const utm: Record<string, string> = {};
        if (data.trackingParameters) {
          const addUtm = (key: string, value?: string) => {
            const trimmed = (value ?? "").trim();
            if (trimmed.length > 0) utm[key] = trimmed;
          };
          addUtm("source", data.utmSource);
          addUtm("medium", data.utmMedium);
          addUtm("campaign", data.utmCampaign);
          addUtm("term", data.utmTerm);
          addUtm("content", data.utmContent);
        }
        const syncOptions = {
          audience: { segmentIds, profileIds: mergedProfileIds },
          tracking: {
            smartSending: Boolean(data.smartSending),
            trackingParameters: Boolean(data.trackingParameters),
            ...(Object.keys(utm).length > 0 ? { utm } : {}),
          },
          skipEstimate: true,
        };

        // Shares the change cache with the audience step's live autosync, so
        // this is usually a no-op network-wise. On a 429 (3 req/10s backend
        // limit), wait briefly and retry — by then the autosync has typically
        // persisted the same payload and the retry sends nothing.
        try {
          await syncAudienceSettings(campaignId, syncOptions);
        } catch (e) {
          if (!isRateLimitError(e)) throw e;
          await new Promise((resolve) => {
            window.setTimeout(resolve, 2_500);
          });
          await syncAudienceSettings(campaignId, syncOptions);
        }
      }

      if (currentStep === 2) {
        const data = form.getValues();
        await campaignsService.updateContent(campaignId, {
          subject: data.emailSubject,
          previewText: data.previewText,
          senderName: data.senderName ?? "",
          senderEmail: data.senderEmail ?? "",
          replyToEmail: data.useReplyTo ? data.replyToEmail : undefined,
        });

        if (data.selectedTemplate && data.selectedTemplate.length > 0) {
          await campaignsService.setTemplate(campaignId, {
            templateId: data.selectedTemplate,
          });
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save step";
      toast.error(message);
      return;
    }

    if (currentStep < TOTAL_STEPS) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      syncUrlStep(nextStep);
    }
  };

  // Template-step send actions: "Preview & send" goes straight to the preview
  // step with sendOption=now; "Schedule" first collects a date/time in the
  // dialog (which sets sendOption=schedule), then advances the same way.
  const advanceToPreview = async (sendOption: "now" | "schedule") => {
    form.setValue("sendOption", sendOption, { shouldDirty: true });
    await handleNext();
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const nextStep = currentStep - 1;
      setCurrentStep(nextStep);
      syncUrlStep(nextStep);
    }
  };

  const onSubmit = async (_data: CampaignFormData) => {
    if (!campaignId) {
      toast.error("Missing campaign id.");
      return;
    }
    if (!canLaunchCampaigns) {
      toast.error("Your role cannot launch campaigns for this organization.");
      return;
    }

    try {
      const data = form.getValues();

      // In-app push campaigns bypass the email render/validate/launch
      // pipeline: POST /campaigns/{id}/send-inapp fans out immediately to
      // the audience's wallet-reachable contacts (no scheduled push sends).
      if (data.channel === "in-app-push") {
        await campaignsService
          .ensureChannels(campaignId, ["inapp"])
          .catch(() => undefined);
        const result = await campaignsService.sendInAppPush(campaignId);
        const recipients = result.recipientCount ?? 0;
        const deliveredNow = result.deliveredNowCount ?? 0;
        toast.success(
          `Push sent to ${recipients} wallet${recipients === 1 ? "" : "s"} (${deliveredNow} delivered live).`
        );
        setShowConfirmation(true);
        return;
      }

      const scheduleDateIso = computeScheduleUtcIso(data);
      await campaignsService.updateSchedule(campaignId, {
        sendOption: data.sendOption,
        scheduleDate: scheduleDateIso,
        scheduleTime:
          data.sendOption === "schedule" ? data.scheduleTime : undefined,
        timezone: activeTimezone,
      });

      // The validator requires at least one enabled channel; nothing else in
      // the email flow sets channelsUsed, so enable EMAIL here. Non-fatal —
      // if it fails, validation below reports the real state.
      await campaignsService
        .ensureChannels(campaignId, ["email"])
        .catch(() => undefined);

      const validation = await campaignsService.validateCampaign(campaignId);
      if (!validation?.valid) {
        const errors = Array.isArray(validation?.errors)
          ? validation.errors
              .map((e) => {
                if (typeof e === "string") return e;
                if (typeof e === "object" && e !== null && "message" in e) {
                  const m = (e as { message?: unknown }).message;
                  if (typeof m === "string" && m.trim().length > 0) return m;
                }
                return null;
              })
              .filter((m): m is string => Boolean(m && m.length > 0))
          : [];

        toast.error(
          errors.length > 0
            ? `Campaign is not ready: ${errors.slice(0, 3).join(" • ")}`
            : "Campaign is not ready to launch."
        );
        return;
      }

      await campaignsService.launchCampaign(campaignId);
      setShowConfirmation(true);
    } catch (e) {
      // An unverified sender domain is the one launch failure the user can
      // fix themselves — point them at the verification flow rather than
      // showing a raw backend string.
      const senderIssue = parseSenderNotVerified(e);
      if (senderIssue) {
        const label = senderIssue.domain || senderIssue.sender;
        toast.error(
          label
            ? `Verify ${label} before sending.`
            : "Verify your sender domain before sending.",
          {
            description: senderIssue.sender
              ? `${senderIssue.sender} isn't verified for this organization yet.`
              : undefined,
            action: {
              label: "Verify domain",
              onClick: () => router.push(SENDER_VERIFICATION_HREF),
            },
            duration: 10_000,
          }
        );
        return;
      }
      const message =
        e instanceof Error ? e.message : "Failed to launch campaign";
      toast.error(message);
    }
  };

  // handleSubmit silently swallows schema failures without this — the send
  // button would appear dead. Surface the first blocking field error instead.
  const onInvalid = (errors: FieldErrors<CampaignFormData>) => {
    for (const value of Object.values(errors)) {
      const message =
        value && typeof value === "object" && "message" in value
          ? (value as { message?: unknown }).message
          : undefined;
      if (typeof message === "string" && message.trim().length > 0) {
        toast.error(message);
        return;
      }
    }
    toast.error("Please complete the required fields before sending.");
  };

  const sendOption = form.watch("sendOption");
  const scheduleDate = form.watch("scheduleDate");
  const scheduleTime = form.watch("scheduleTime");
  const timezone = form.watch("timezone");

  return (
    <div className="min-h-screen bg-background font-sans -mt-[20px] z-2">
      {/* Header with Progress */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <Link href={PRIVATE_ROUTES.CAMPAIGNS}>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl transition-all duration-300"
              >
                <ArrowLeftIcon aria-hidden="true" className="mr-2 h-4 w-4" />
                Back to campaigns
              </Button>
            </Link>
            <div className="text-sm text-muted-foreground font-medium">
              Step {currentStep} of {TOTAL_STEPS}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 sm:px-6 md:py-6 lg:px-10 max-w-[1440px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
            <div className="bg-card border border-border rounded-2xl shadow-xl transition-all duration-300">
              {!showConfirmation ? (
                <>
                  {!campaignId && (
                    <div className="border-b border-border p-6 md:p-8 lg:p-10">
                      <div className="text-sm text-muted-foreground">
                        {bootstrapError ?? "Creating campaign draft…"}
                      </div>
                      {bootstrapError && (
                        <div className="mt-4">
                          <Button
                            type="button"
                            onClick={() => {
                              setBootstrapError(null);
                              isBootstrappingInFlightRef.current = false;
                            }}
                            className="rounded-xl"
                          >
                            Retry
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {currentStep === 1 && (
                    <AudienceStep
                      form={form}
                      campaignId={campaignId}
                      canSync={
                        Boolean(campaignId) &&
                        hasHydratedCampaign &&
                        !isHydratingCampaign &&
                        !isBootstrappingCampaign
                      }
                      tags={audienceTagsQuery.data ?? []}
                      segments={audienceSegmentsQuery.data ?? []}
                      segmentsLoading={audienceSegmentsQuery.isLoading}
                      segmentsError={
                        audienceSegmentsQuery.error instanceof Error
                          ? audienceSegmentsQuery.error.message
                          : null
                      }
                    />
                  )}
                  {currentStep === 2 && (
                    <TemplateStep
                      form={form}
                      campaignId={campaignId}
                      verifiedSenderIdentities={verifiedSenderIdentities}
                      senderIdentitiesLoading={senderIdentitiesQuery.isLoading}
                      canSendEmail={canSendEmail}
                    />
                  )}
                  {currentStep === 3 && (
                    <CampaignPreviewStep
                      form={form}
                      campaignId={campaignId}
                      canLaunch={canLaunchCampaigns && !isBootstrappingCampaign}
                    />
                  )}

                  {/* Navigation. The template step (2) replaces "Continue"
                      with the send-timing actions; the preview step (3) owns
                      the send button, so its footer only navigates back. */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6 md:p-8 lg:p-10 border-t border-border">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleBack}
                      disabled={currentStep === 1 || isBootstrappingCampaign}
                      className="rounded-xl transition-all duration-300 disabled:opacity-50"
                    >
                      <ArrowLeftIcon
                        aria-hidden="true"
                        className="mr-2 h-4 w-4"
                      />
                      Back
                    </Button>

                    {currentStep === 1 ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={!campaignId || isBootstrappingCampaign}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 md:px-8 transition-all duration-300 ease-in-out hover:shadow-lg"
                      >
                        Continue
                        <ArrowRightIcon
                          aria-hidden="true"
                          className="ml-2 h-4 w-4"
                        />
                      </Button>
                    ) : null}

                    {currentStep === 2 ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {/* In-app push sends are immediate (send-inapp has no
                            scheduling), so Schedule is email-only. */}
                        {form.watch("channel") !== "in-app-push" ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setScheduleDialogOpen(true)}
                            disabled={!campaignId || isBootstrappingCampaign}
                            className="rounded-xl transition-all duration-300"
                          >
                            <ClockIcon
                              aria-hidden="true"
                              className="mr-2 h-4 w-4"
                            />
                            Schedule
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          onClick={() => advanceToPreview("now")}
                          disabled={!campaignId || isBootstrappingCampaign}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 md:px-8 transition-all duration-300 ease-in-out hover:shadow-lg"
                        >
                          Preview & send
                          <ArrowRightIcon
                            aria-hidden="true"
                            className="ml-2 h-4 w-4"
                          />
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <ScheduleSendDialog
                    form={form}
                    open={scheduleDialogOpen}
                    onOpenChange={setScheduleDialogOpen}
                    onConfirm={() => {
                      advanceToPreview("schedule").catch(() => undefined);
                    }}
                  />
                </>
              ) : (
                <ConfirmationPage
                  sendOption={sendOption}
                  scheduleDate={scheduleDate}
                  scheduleTime={scheduleTime}
                  timezone={timezone}
                />
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
