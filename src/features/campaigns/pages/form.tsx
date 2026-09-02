"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  BeakerIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FieldErrors, UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import { Form } from "@/ui/form";
import { Input } from "@/ui/input";

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
import {
  type CampaignPushContent,
  campaignsService,
  type PushDelivery,
  type PushExpiresDays,
  type PushFrequency,
  type PushMaxPerSession,
  type PushPlacement,
  type PushTrigger,
} from "@/features/campaigns/campaigns.service";
import { AudienceStep } from "@/features/campaigns/components/campaign-form/audience-step";
import { ConfirmationPage } from "@/features/campaigns/components/campaign-form/campaign-confirmation";
import {
  InAppMessageStep,
  InAppPreview,
} from "@/features/campaigns/components/campaign-form/in-app-message-step";
import { InlineSchedule } from "@/features/campaigns/components/campaign-form/inline-schedule";
import { TemplateStep } from "@/features/campaigns/components/campaign-form/template-step";
import { WizardStepRail } from "@/features/campaigns/components/campaign-form/wizard-step-rail";
import { WizardSummary } from "@/features/campaigns/components/campaign-form/wizard-summary";
import {
  ALL_CONTACTS_SELECTION_ID,
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
import { useOrgSwitcherContext } from "@/features/common/layout/components/org-switcher-context";
import {
  type IntelligenceSegment,
  intelligenceService,
} from "@/features/intelligence/intelligence.service";
import { senderIdentitiesService } from "@/features/settings/sender-identities.service";
import { LIBRARY_EMAIL_TEMPLATES } from "@/features/templates/library-templates";
import { templatesService } from "@/features/templates/templates.service";
import {
  type SendConfirmDetail,
  SendConfirmDialog,
} from "@/shared/components/common/send-confirm-dialog";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";
import { useActiveTimezone } from "@/shared/hooks/client/use-timezones";

// Steps: 1 Audience & tracking → 2 Template & message → 3 Preview & send.
// Campaign name/type are collected up front in the create-campaign sheet.
// Preview has its own page so the rendered email gets room, alongside the
// campaign details and a send-a-test control.
const TOTAL_STEPS = 3;
/**
 * Domain verification lives in the account tab's "Sender verification"
 * section, which is collapsed by default - `section=` expands and scrolls to
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

/** Enough to gate the Send-test button; the backend is the real validator. */
const isLikelyEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const PUSH_PLACEMENTS: readonly PushPlacement[] = [
  "modal",
  "banner",
  "slide-in",
  "inline",
  "mobile-push",
];
const PUSH_TRIGGERS: readonly PushTrigger[] = [
  "wallet-connect",
  "page-view",
  "manual",
];
const PUSH_FREQUENCIES: readonly PushFrequency[] = [
  "once-per-wallet",
  "once-per-session",
  "every-time",
  "until-dismissed",
];
const PUSH_DELIVERIES: readonly PushDelivery[] = [
  "wait-for-connect",
  "only-now",
];
const PUSH_EXPIRES: readonly PushExpiresDays[] = [3, 7, 14, 30];
const PUSH_MAXPER: readonly PushMaxPerSession[] = [1, 2, 3];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Hydrate the composer form fields from a persisted `channelsContent.inapp`
 *  object, validating every enum/color/number before it reaches the form. */
function readPushInto(
  inapp: Record<string, unknown>,
  into: Partial<CampaignFormData>
): void {
  const str = (v: unknown): string | undefined =>
    typeof v === "string" ? v : undefined;
  const title = str(inapp.title);
  if (title !== undefined) into.emailSubject = title;
  const body = str(inapp.body);
  if (body !== undefined) into.pushBody = body;
  const ctaLabel = str(inapp.ctaLabel);
  if (ctaLabel !== undefined) into.pushCtaLabel = ctaLabel;
  const ctaUrl = str(inapp.ctaUrl);
  if (ctaUrl !== undefined) into.pushCtaUrl = ctaUrl;
  const placement = str(inapp.placement);
  if (placement && PUSH_PLACEMENTS.includes(placement as PushPlacement))
    into.pushPlacement = placement as PushPlacement;
  const trigger = str(inapp.trigger);
  if (trigger && PUSH_TRIGGERS.includes(trigger as PushTrigger))
    into.pushTrigger = trigger as PushTrigger;
  const frequency = str(inapp.frequency);
  if (frequency && PUSH_FREQUENCIES.includes(frequency as PushFrequency))
    into.pushFrequency = frequency as PushFrequency;
  const delivery = str(inapp.delivery);
  if (delivery && PUSH_DELIVERIES.includes(delivery as PushDelivery))
    into.pushDelivery = delivery as PushDelivery;
  const accent = str(inapp.accent);
  if (accent && HEX_COLOR.test(accent)) into.pushAccent = accent;
  if (typeof inapp.dismissible === "boolean")
    into.pushDismissible = inapp.dismissible;
  if (typeof inapp.expiresDays === "number")
    into.pushExpiresDays = String(inapp.expiresDays);
  if (typeof inapp.maxPerSession === "number")
    into.pushMaxPerSession = String(inapp.maxPerSession);
}

/** Map the composer's form values to the backend's full in-app push contract
 *  (`channelsContent.inapp`), coercing the numeric fields the form holds as
 *  strings and only sending a CTA when both label + URL are present. */
function toPushContent(data: CampaignFormData): CampaignPushContent {
  const label = (data.pushCtaLabel ?? "").trim();
  const url = (data.pushCtaUrl ?? "").trim();
  const accent = (data.pushAccent ?? "").trim();
  const expires = Number(data.pushExpiresDays);
  const maxPer = Number(data.pushMaxPerSession);
  return {
    title: (data.emailSubject ?? "").trim(),
    body: (data.pushBody ?? "").trim(),
    // Backend requires the URL whenever a label is set, so send the CTA only as
    // a complete pair - an incomplete CTA never blocks the launch.
    ...(label && url ? { ctaLabel: label, ctaUrl: url } : {}),
    placement: data.pushPlacement,
    trigger: data.pushTrigger,
    frequency: data.pushFrequency,
    accent: HEX_COLOR.test(accent) ? accent : "#4f46e5",
    dismissible: data.pushDismissible,
    delivery: data.pushDelivery,
    expiresDays: PUSH_EXPIRES.includes(expires as PushExpiresDays)
      ? (expires as PushExpiresDays)
      : 14,
    maxPerSession: PUSH_MAXPER.includes(maxPer as PushMaxPerSession)
      ? (maxPer as PushMaxPerSession)
      : 1,
  };
}

/**
 * Persist the final step's message + template so the saved campaign reflects
 * the current edits. Shared by the launch flow and the send-a-test control -
 * a test renders from saved content, so it must run before sendTest too, or
 * the test would use stale content.
 */
const persistCampaignContent = async (
  campaignId: string,
  data: CampaignFormData
): Promise<void> => {
  // In-app push carries its own composer - persist the full notification
  // (placement + display/delivery settings) so the chosen format round-trips
  // and rides the send payload, instead of the email content/template.
  if (data.channel === "in-app-push") {
    await campaignsService.setPushContent(campaignId, toPushContent(data));
    return;
  }
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
};

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
    // Intelligence segments carry their member count as `size` (derived) or
    // `matchCount`, NOT `count`/`totalProfiles` - reading the wrong field is why
    // every segment showed 0. `size` is null for lazily-resolved rule segments.
    count:
      typeof value.count === "number"
        ? value.count
        : typeof value.size === "number"
          ? value.size
          : typeof value.matchCount === "number"
            ? value.matchCount
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

function EmailPreviewFrame({ html }: { html: string }) {
  // Emails are authored at a fixed 600px design width. Instead of letting that
  // 600px table overflow a narrower preview column, render at 600px and scale
  // the whole frame down to the container width so it ALWAYS fits. The rendered
  // height is measured from the content (same-origin, scripts still blocked) so
  // the frame hugs the email with no letterboxing.
  const BASE_WIDTH = 600;
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(BASE_WIDTH);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      // Cap at 1 so we never upscale (blurry) - only shrink to fit.
      if (w > 0) setScale(Math.min(1, w / BASE_WIDTH));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const measure = () => {
    try {
      const h = iframeRef.current?.contentDocument?.body?.scrollHeight;
      if (h && h > 0) setContentHeight(h);
    } catch {
      // Shouldn't happen for srcDoc; keep the fallback height.
    }
  };

  return (
    <div
      ref={wrapRef}
      className="w-full overflow-hidden bg-white"
      style={{ height: Math.round(contentHeight * scale) }}
    >
      <iframe
        ref={iframeRef}
        title="Email HTML preview"
        srcDoc={html}
        onLoad={measure}
        // allow-same-origin (no allow-scripts) lets us read the rendered height
        // to size the frame; scripts in the template still can't run.
        sandbox="allow-same-origin"
        style={{
          width: BASE_WIDTH,
          height: contentHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          border: "none",
        }}
      />
    </div>
  );
}

/** One line of the review checklist: a satisfied check, a label/value, and an
 *  optional jump-back-to-edit link. */
function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <CheckIcon className="h-2.5 w-2.5" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="truncate text-xs text-muted-foreground">{value}</div>
        </div>
      </div>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Edit
        </button>
      ) : null}
    </div>
  );
}

function CampaignPreviewStep({
  form,
  campaignId,
  canLaunch,
  onEditStep,
  estimatedRecipients,
  appDomain,
  brandMark,
}: {
  form: UseFormReturn<CampaignFormData>;
  campaignId?: string;
  canLaunch: boolean;
  /** Jumps the wizard back to an earlier step from the review checklist. */
  onEditStep?: (step: number) => void;
  /** Live recipient estimate from the audience step, for the "N recipients" copy. */
  estimatedRecipients?: number | null;
  /** Org verified domain, shown in the in-app notification preview. */
  appDomain?: string;
  /** Org initials for the in-app notification badge. */
  brandMark?: string;
}) {
  const [testRecipient, setTestRecipient] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showTestField, setShowTestField] = useState(false);

  const handleSendTest = async () => {
    const to = testRecipient.trim();
    if (!campaignId || !isLikelyEmail(to)) return;
    setIsSendingTest(true);
    try {
      // A test renders from saved content, so persist the current message +
      // template first - otherwise the test reflects a previous save.
      await persistCampaignContent(campaignId, form.getValues());
      await campaignsService.sendTest(campaignId, { to });
      toast.success(`Test sent to ${to}.`);
    } catch (e) {
      // Surface the backend reason without the technical "[HTTP nnn]" prefix,
      // and translate the two most common rejections into an action.
      const raw = (e instanceof Error ? e.message : "").replace(
        /^\[HTTP \d+\]\s*/,
        ""
      );
      let friendly = raw || "Couldn't send the test email.";
      if (/verified|SENDER_NOT_VERIFIED|fallback sender/i.test(raw)) {
        friendly =
          "Test not sent: choose a verified sender first (Settings → Sending). Test emails can't go from the platform fallback address.";
      } else if (/content|empty|body|render|template/i.test(raw)) {
        friendly =
          "Test not sent: add email content or pick a template before sending a test.";
      }
      toast.error(friendly);
    } finally {
      setIsSendingTest(false);
    }
  };

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

  // Auto-load the rendered email as soon as the step opens - no manual
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

  const previewHtml = previewQuery.data?.html ?? "";
  const previewMissingFields = previewQuery.data?.missingFields ?? [];
  const previewErrorMessage =
    previewQuery.error instanceof Error
      ? previewQuery.error.message
      : "Failed to generate preview.";

  const values = form.watch();
  const isScheduled = values.sendOption === "schedule";

  // Prefer the live recipient estimate over the raw count of selected sources -
  // "3 recipients" reads better than "1 audience source".
  const est = estimatedRecipients ?? null;
  const recipientLabel =
    est !== null
      ? `${est.toLocaleString()} ${
          isPush
            ? est === 1
              ? "wallet"
              : "wallets"
            : est === 1
              ? "recipient"
              : "recipients"
        }`
      : isPush
        ? "Wallet-reachable contacts"
        : "Your selected audience";
  const audienceSummary = `${recipientLabel}${
    values.smartSending ? " · smart sending" : ""
  }`;
  const timezone =
    typeof values.timezone === "string" && values.timezone.length > 0
      ? values.timezone
      : "UTC";

  const scheduleLabel = useMemo(() => {
    if (!isScheduled) return "Send now";
    if (!values.scheduleDate || !values.scheduleTime) return "Schedule (-)";
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
    <div className="space-y-6 animate-in fade-in duration-500 p-4 sm:p-6">
      <div className="space-y-0.5">
        <h2 className="text-xl font-semibold text-foreground">
          Ready to send?
        </h2>
        <p className="text-sm text-muted-foreground">
          Give it one last look - this is exactly what lands.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* Details checklist - one glanceable row per decision, each with a
              jump-back-and-edit affordance. */}
          <div>
            <div className="text-sm font-medium text-foreground">Details</div>
            <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              <ReviewRow
                label="Audience"
                value={audienceSummary}
                onEdit={onEditStep ? () => onEditStep(1) : undefined}
              />
              <ReviewRow
                label={isPush ? "Notification" : "Message"}
                value={values.emailSubject || "No subject"}
                onEdit={onEditStep ? () => onEditStep(2) : undefined}
              />
              {!isPush ? (
                <ReviewRow
                  label="From"
                  value={
                    `${values.senderName ? `${values.senderName} ` : ""}${
                      (values.senderEmail ?? "").trim() || "-"
                    }`.trim() || "-"
                  }
                  onEdit={onEditStep ? () => onEditStep(2) : undefined}
                />
              ) : null}
              <ReviewRow label="Delivery" value={scheduleLabel} />
              <ReviewRow
                label="Tracking"
                value={
                  values.trackingParameters ? "UTM tracking on" : "Tracking off"
                }
                onEdit={onEditStep ? () => onEditStep(1) : undefined}
              />
            </div>
          </div>

          {!canLaunch ? (
            <div className="flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
              <ExclamationTriangleIcon
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
              />
              <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-400">
                You can&apos;t send this campaign yet. Your role can&apos;t
                launch campaigns for this organization - ask an admin to send,
                or check your sender verification in Settings.
              </p>
            </div>
          ) : null}

          {/* Delivery timing as selectable cards (push always sends now). */}
          <div>
            <div className="text-sm font-medium text-foreground">Delivery</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  form.setValue("sendOption", "now", { shouldDirty: true })
                }
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
                  !isScheduled
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <PaperAirplaneIcon
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    !isScheduled ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    Send now
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Delivery starts immediately.
                  </span>
                </span>
              </button>

              {!isPush ? (
                <button
                  type="button"
                  onClick={() =>
                    form.setValue("sendOption", "schedule", {
                      shouldDirty: true,
                    })
                  }
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
                    isScheduled
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <ClockIcon
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 h-5 w-5 shrink-0",
                      isScheduled ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      Schedule for later
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {isScheduled ? scheduleLabel : "Pick a date & time."}
                    </span>
                  </span>
                </button>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-4">
                  <ClockIcon
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                  />
                  <span className="text-xs text-muted-foreground">
                    In-app push always sends immediately.
                  </span>
                </div>
              )}
            </div>
            {!isPush && isScheduled ? <InlineSchedule form={form} /> : null}
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
                Edit the template and add a fallback - e.g.{" "}
                <span className="font-mono">
                  {'{{ ens_name | default: "there" }}'}
                </span>{" "}
                - or switch to a wallet-aware token like{" "}
                <span className="font-mono">{"{{ greeting_name }}"}</span>,
                which never renders blank.
              </p>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-foreground">
              {isPush ? "Notification preview" : "Inbox preview"}
            </div>
            {/* Send a test reveals an inline field on click. */}
            {!isPush ? (
              <button
                type="button"
                onClick={() => setShowTestField((v) => !v)}
                aria-expanded={showTestField}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  showTestField
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:bg-muted"
                )}
              >
                <BeakerIcon aria-hidden="true" className="h-4 w-4" />
                Send a test
              </button>
            ) : null}
          </div>

          {/* Inline test field, revealed by the Send a test button. */}
          {!isPush && showTestField ? (
            <div className="mt-3 flex gap-2 rounded-xl border border-border bg-muted/30 p-2">
              <Input
                id="campaign-test-recipient"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                onKeyDown={(e) => {
                  // Enter here means "send the test", never "submit the wizard".
                  // Without this, Enter bubbles to the form's submit button and
                  // pops the send-campaign confirmation instead.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (isLikelyEmail(testRecipient) && !isSendingTest) {
                      handleSendTest();
                    }
                  }
                }}
                disabled={!normalizedCampaignId || isSendingTest}
                className="h-9 flex-1 rounded-lg"
              />
              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0 rounded-lg"
                disabled={
                  !normalizedCampaignId ||
                  isSendingTest ||
                  !isLikelyEmail(testRecipient)
                }
                onClick={handleSendTest}
              >
                {isSendingTest ? (
                  <ArrowPathIcon
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : (
                  "Send test"
                )}
              </Button>
            </div>
          ) : null}

          {/* Envelope header - mirrors what lands in the inbox. */}
          {!isPush ? (
            <dl className="mt-3 space-y-1 rounded-xl border border-border bg-muted/30 p-3 text-xs">
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 text-muted-foreground">From</dt>
                <dd className="min-w-0 truncate text-foreground">
                  {values.senderName ? `${values.senderName} ` : ""}
                  {(values.senderEmail ?? "").trim()
                    ? `<${(values.senderEmail ?? "").trim()}>`
                    : "-"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 text-muted-foreground">To</dt>
                <dd className="min-w-0 truncate text-foreground">
                  {recipientLabel}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 text-muted-foreground">Subject</dt>
                <dd className="min-w-0 truncate font-medium text-foreground">
                  {values.emailSubject || "No subject"}
                </dd>
              </div>
            </dl>
          ) : null}

          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            {!normalizedCampaignId ? (
              <div className="flex h-[560px] sm:h-[720px] items-center justify-center bg-card p-6 text-center text-sm text-muted-foreground">
                Missing campaign id.
              </div>
            ) : isPush ? (
              <div className="bg-muted/20 p-3">
                <InAppPreview
                  placement={values.pushPlacement ?? "modal"}
                  title={values.emailSubject ?? ""}
                  body={values.pushBody ?? ""}
                  ctaLabel={values.pushCtaLabel ?? ""}
                  accent={values.pushAccent ?? "#4f46e5"}
                  dismissible={values.pushDismissible ?? true}
                  domain={appDomain}
                  brandMark={brandMark}
                />
              </div>
            ) : previewQuery.isLoading ? (
              <div
                className="flex h-[560px] sm:h-[720px] animate-pulse flex-col gap-3 bg-card p-6"
                aria-hidden="true"
              >
                <div className="h-6 w-1/3 rounded-md bg-muted" />
                <div className="h-40 rounded-md bg-muted" />
                <div className="h-4 w-2/3 rounded-md bg-muted" />
                <div className="h-4 w-1/2 rounded-md bg-muted" />
                <div className="flex-1 rounded-md bg-muted" />
              </div>
            ) : previewQuery.isError ? (
              <div className="flex h-[560px] sm:h-[720px] items-center justify-center bg-card p-6 text-center">
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
            ) : previewHtml.trim().length > 0 ? (
              // The email fills the preview column so it reads as the message
              // itself; scroll within the framed area for tall templates.
              <div className="overflow-auto bg-muted/20 p-3">
                <div className="mx-auto w-full overflow-hidden rounded-xl border border-border shadow-sm">
                  <EmailPreviewFrame html={previewHtml} />
                </div>
              </div>
            ) : (
              <div className="flex h-[560px] sm:h-[720px] items-center justify-center bg-card p-6 text-center">
                <div className="max-w-md space-y-2">
                  <div className="text-sm font-medium text-foreground">
                    No preview available yet
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Pick a template on the Message step (or design one in the
                    editor) to see it here.
                  </div>
                </div>
              </div>
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

  const queryClient = useQueryClient();

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
  // Pre-send guard: the submit button opens this; the real launch only fires
  // once the user confirms. `isLaunching` drives the dialog's confirm spinner.
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  // Lifted from AudienceStep so the summary rail shows the estimate on every step.
  const [wizEstimate, setWizEstimate] = useState<number | null>(null);
  const [campaignId, setCampaignId] = useState<string | undefined>(
    initialCampaignFromUrl
  );
  const [isBootstrappingCampaign, setIsBootstrappingCampaign] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isHydratingCampaign, setIsHydratingCampaign] = useState(false);
  const [hasHydratedCampaign, setHasHydratedCampaign] = useState(false);
  // Hydration completing (Promise.allSettled) is not the same as it
  // succeeding: a rejected getAudience/getContent still marks the campaign
  // "hydrated" while the form holds empty defaults. Gate writes on these so a
  // failed load can't be persisted back over the saved campaign.
  const [audienceHydrationOk, setAudienceHydrationOk] = useState(false);
  const [contentHydrationOk, setContentHydrationOk] = useState(false);

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

  // Deep-link from "Create campaign from segment": ?segment=<id> seeds the
  // audience with that segment on a fresh campaign (ignored when editing one).
  useEffect(() => {
    const segmentId = searchParams?.get("segment");
    const campaignId = searchParams?.get("campaign");
    if (segmentId && !campaignId) {
      form.setValue("selectedAudiences", [segmentId], { shouldDirty: false });
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Saved templates, so the summary can show a template's NAME instead of its
  // backend id (library templates resolve locally without a fetch).
  const summaryTemplatesQuery = useQuery({
    queryKey: ["templates", "list", "campaign-summary", organizationId],
    enabled: Boolean(organizationId),
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: () => templatesService.list({}, organizationId ?? undefined),
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
    queryKey: ["intelligence", "segments", "campaign-form", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const response = await intelligenceService.listSegments({ limit: 100 });
      const items = normalizeIntelligenceSegments(response);
      return items
        .map(toCampaignSegment)
        .filter((item): item is Segment => !!item);
    },
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Audience tags are offered in the picker as `tag:<name>` selections and
  // expanded to profileIds at save time (the backend audience contract only
  // knows profiles + segments).
  const audienceTagsQuery = useQuery({
    queryKey: ["audience", "tags", "campaign-form", organizationId],
    enabled: Boolean(organizationId),
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
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Audience Lists (saved /audience/segments), distinct from the intelligence
  // segments above. Powers the campaign audience "Lists" tab. The system
  // suppression segment is excluded (it lives in the Suppressed tab only).
  const audienceListsQuery = useQuery({
    queryKey: ["audience", "lists", "campaign-form", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const rows = await audienceService.listSegments({ limit: 100 });
      return rows
        .filter((s) => {
          const criteria = isJsonObject(s.criteria) ? s.criteria : null;
          if (criteria && typeof criteria.system === "string") {
            return criteria.system.toLowerCase() !== "suppressed";
          }
          return s.name.trim().toLowerCase() !== "suppressed emails";
        })
        .map((s): List => ({
          id: s.id,
          name: s.name,
          count: typeof s.count === "number" ? s.count : 0,
          starred: Boolean(s.starred),
          // Channel-reachability, so the picker can dim a list that can't
          // deliver on the chosen channel. Absent on older responses -> left
          // undefined so the row stays selectable.
          reachableVia: Array.isArray(s.reachableVia)
            ? s.reachableVia.filter(
                (r): r is "email" | "push" => r === "email" || r === "push"
              )
            : undefined,
        }));
    },
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
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
        // Nothing to load - the form defaults are the source of truth.
        setAudienceHydrationOk(true);
        setContentHydrationOk(true);
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

        // Writes require the specific loads they'd overwrite to have
        // succeeded, not merely settled.
        setAudienceHydrationOk(
          audienceRes.status === "fulfilled" &&
            trackingRes.status === "fulfilled"
        );
        setContentHydrationOk(contentRes.status === "fulfilled");

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

        // In-app push composer: restore the full notification (placement +
        // display/delivery settings) from the persisted `channelsContent.inapp`
        // (campaign) or the `push` mirror on the content endpoint, so reopening
        // a draft brings back the chosen format - not just title/body/CTA.
        const inappSource = (() => {
          if (
            campaignRes.status === "fulfilled" &&
            isJsonObject(campaignRes.value)
          ) {
            const cc = campaignRes.value.channelsContent;
            if (isJsonObject(cc) && isJsonObject(cc.inapp)) return cc.inapp;
          }
          if (
            contentRes.status === "fulfilled" &&
            isJsonObject(contentRes.value) &&
            isJsonObject(contentRes.value.push)
          ) {
            return contentRes.value.push;
          }
          return undefined;
        })();
        if (inappSource) {
          readPushInto(inappSource, nextValues);
          // The campaign carries in-app content, so it's a push campaign -
          // restore the channel too. Otherwise a cold reload (no `?channel=` in
          // the URL) falls back to the email composer and the notification is
          // hidden even though it's saved.
          nextValues.channel = "in-app-push";
        }

        if (audienceRes.status === "fulfilled") {
          const aObj: Record<string, unknown> = isJsonObject(audienceRes.value)
            ? audienceRes.value
            : {};
          // GET /campaigns/{id}/audience returns { profileIds, segmentIds }.
          // Reading only listIds meant a saved contact selection never
          // hydrated, so reopening a campaign showed an empty audience - and
          // the next Continue saved that emptiness back over it. listIds is
          // kept purely as a fallback for anything persisted by older builds.
          const {
            all: allRaw,
            profileIds: profileIdsRaw,
            listIds: listIdsRaw,
            segmentIds: segmentIdsRaw,
          } = aObj;
          if (allRaw === true) {
            // Saved as "send to everyone" - restore the sentinel selection.
            nextValues.selectedAudiences = [ALL_CONTACTS_SELECTION_ID];
          } else {
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
    // Step 1 validates the audience; step 2 validates the message fields
    // rendered on the template step (push has no sender identity, so only the
    // subject/title applies).
    const fieldsToValidate: (keyof CampaignFormData)[] =
      currentStep === 1
        ? ["selectedAudiences"]
        : currentStep === 2
          ? form.getValues("channel") === "in-app-push"
            ? ["emailSubject"]
            : ["emailSubject", "senderName", "senderEmail"]
          : [];

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
        // Persist the audience/tracking selection before advancing. The
        // audience step's debounced autosync usually wrote it already (the
        // change cache then makes this a no-op); this flush covers a change
        // made just before Continue. A 429 (3 req/10s) is retried once after
        // the window.
        const audiencePayload = await buildAudienceSyncOptions(
          form.getValues()
        );
        try {
          await syncAudienceSettings(campaignId, audiencePayload);
        } catch (e) {
          if (!isRateLimitError(e)) throw e;
          await new Promise((resolve) => {
            window.setTimeout(resolve, 11_000);
          });
          await syncAudienceSettings(campaignId, audiencePayload);
        }
      }

      if (currentStep === 2) {
        // Persist the message + template before moving to the preview so it
        // renders the current edits.
        await persistCampaignContent(campaignId, form.getValues());
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

  /**
   * Build the audience + tracking payload for the current form state. Shared
   * by the pre-send flush; expanding tag selections into profile ids needs an
   * await, so this is async.
   */
  const buildAudienceSyncOptions = async (data: CampaignFormData) => {
    const { all, segmentIds, profileIds, tagNames } =
      partitionAudienceSelection(
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
    // Parse the per-campaign Smart Sending override the same way the audience
    // step does (blank/out-of-range → omit), so a last-second edit persists
    // through the Continue flush and not only via the debounced autosync.
    const windowRaw = (data.smartSendingWindowHours ?? "").trim();
    const windowParsed = Number(windowRaw);
    const smartSendingWindowHours =
      windowRaw.length > 0 &&
      Number.isInteger(windowParsed) &&
      windowParsed >= 1 &&
      windowParsed <= 168
        ? windowParsed
        : undefined;
    return {
      audience: {
        segmentIds,
        profileIds: mergedProfileIds,
        ...(all ? { all: true } : {}),
      },
      tracking: {
        smartSending: Boolean(data.smartSending),
        trackingParameters: Boolean(data.trackingParameters),
        ...(smartSendingWindowHours !== undefined
          ? { smartSendingWindowHours }
          : {}),
        ...(Object.keys(utm).length > 0 ? { utm } : {}),
      },
      skipEstimate: true,
    };
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const nextStep = currentStep - 1;
      setCurrentStep(nextStep);
      syncUrlStep(nextStep);
    }
  };

  // RHF validation gates opening the confirm dialog; the real send only fires
  // from the dialog's confirm action (performLaunch below).
  const onSubmit = (_data: CampaignFormData) => {
    if (!campaignId) {
      toast.error("Missing campaign id.");
      return;
    }
    if (!canLaunchCampaigns) {
      toast.error("Your role cannot launch campaigns for this organization.");
      return;
    }
    setShowSendConfirm(true);
  };

  const performLaunch = async () => {
    if (!campaignId) {
      toast.error("Missing campaign id.");
      return;
    }
    if (!canLaunchCampaigns) {
      toast.error("Your role cannot launch campaigns for this organization.");
      return;
    }

    setIsLaunching(true);
    try {
      const data = form.getValues();

      // The message and template now live on this final step, so persist them
      // before sending. Audience/tracking was saved on step 1 (Continue +
      // the audience step's autosync), so it isn't re-sent here.
      await persistCampaignContent(campaignId, data);

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
        // Refresh the list + this campaign so the run (and any status change)
        // are reflected instead of leaving a stale draft row on screen.
        await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        // A 2xx with zero recipients is NOT a send - the audience resolved to no
        // wallet-reachable contacts. Say so plainly instead of a false "sent",
        // and don't advance to the "done" screen.
        if (recipients === 0) {
          toast.warning(
            "Nobody was reached. In-app push only reaches contacts with a connected wallet - this audience has none. Pick a wallet-reachable audience and try again."
          );
          return;
        }
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
      // the email flow sets channelsUsed, so enable EMAIL here. Non-fatal -
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
      // fix themselves - point them at the verification flow rather than
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
    } finally {
      setIsLaunching(false);
      setShowSendConfirm(false);
    }
  };

  // handleSubmit silently swallows schema failures without this - the send
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

  // Persist the campaign name the moment the user finishes editing it (rather
  // than waiting on the 15s autosave), and refresh the campaigns list so the
  // rename reflects there immediately - works whatever the campaign's status.
  const lastPersistedNameRef = useRef<string | null>(null);
  const persistCampaignName = () => {
    if (!campaignId) return;
    const name = (form.getValues("campaignName") ?? "").trim();
    if (!name || name === lastPersistedNameRef.current) return;
    lastPersistedNameRef.current = name;
    campaignsService
      .updateCampaign(campaignId, { name })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["campaigns", "list"] });
      })
      .catch(() => {
        lastPersistedNameRef.current = null;
      });
  };

  const sendOption = form.watch("sendOption");
  const scheduleDate = form.watch("scheduleDate");
  const scheduleTime = form.watch("scheduleTime");
  const timezone = form.watch("timezone");

  // Persistent right-column summary, kept in sync across steps.
  const wizIsPush = form.watch("channel") === "in-app-push";

  // Org identity for the in-app preview: verified sending domain first, else a
  // slug-derived org domain - never a generic placeholder. The badge uses the
  // org's initials instead of a hardcoded mark.
  const { activeOrg } = useOrgSwitcherContext();
  const pushAppDomain = useMemo(() => {
    const def =
      verifiedSenderIdentities.find((i) => i.isDefault) ??
      verifiedSenderIdentities[0];
    const email = def?.email ?? "";
    const at = email.indexOf("@");
    const host = at >= 0 ? email.slice(at + 1).trim() : "";
    if (host.length > 0) return host;
    // The org's own simple-name domain (e.g. "acme.com"), never our
    // platform host.
    const slug = (activeOrg?.slug ?? activeOrg?.name ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "");
    if (slug.length > 0) return slug.includes(".") ? slug : `${slug}.com`;
    return "your-dapp.com";
  }, [verifiedSenderIdentities, activeOrg?.slug, activeOrg?.name]);
  const pushBrandMark = useMemo(() => {
    const name = (activeOrg?.name ?? "").trim();
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    return initials || "APP";
  }, [activeOrg?.name]);
  const wizTemplate = form.watch("selectedTemplate") ?? "";
  const wizTemplateName = useMemo(() => {
    if (!wizTemplate) return "";
    const saved = (summaryTemplatesQuery.data ?? []).find(
      (t) => t.id === wizTemplate
    );
    if (saved?.name) return saved.name;
    const lib = LIBRARY_EMAIL_TEMPLATES.find((t) => t.id === wizTemplate);
    if (lib?.name) return lib.name;
    // Unknown id (list still loading or a deleted template): never print a raw
    // backend id on the summary.
    const looksLikeId =
      !wizTemplate.includes(" ") && /^[a-z0-9]{16,}$/i.test(wizTemplate);
    return looksLikeId ? "Selected template" : wizTemplate;
  }, [wizTemplate, summaryTemplatesQuery.data]);
  const wizSummary = {
    campaignName: form.watch("campaignName") ?? "",
    channel: wizIsPush ? "In-app push" : "Email",
    sender: wizIsPush
      ? "In-app push"
      : [form.watch("senderName"), form.watch("senderEmail")]
          .map((value) => (value ?? "").trim())
          .filter(Boolean)
          .join(" · ") || "-",
    template: wizTemplateName.length > 0 ? wizTemplateName : "-",
    delivery: sendOption === "schedule" ? "Scheduled" : "Send immediately",
  };

  // In-app push surfaces different config than email (opens/expires vs
  // sender/template) - override the summary rows for it.
  const wizPushRows = wizIsPush
    ? [
        { label: "Channel", value: "In-app push" },
        {
          label: "Opens",
          value: (form.watch("pushCtaUrl") ?? "").trim() || "-",
        },
        {
          label: "Delivery",
          value:
            form.watch("pushDelivery") === "only-now"
              ? "Immediately"
              : "On next connect",
        },
        {
          label: "Expires",
          value: `${form.watch("pushExpiresDays") ?? "14"} days`,
        },
        {
          label: "Smart sending",
          value: form.watch("smartSending") ? "On" : "Off",
        },
      ]
    : undefined;

  // Minimal "what's about to happen" summary for the pre-send guard.
  const sendConfirmDetails: SendConfirmDetail[] = useMemo(() => {
    const recipients =
      wizEstimate !== null
        ? `${wizEstimate.toLocaleString()} ${
            wizIsPush
              ? wizEstimate === 1
                ? "wallet"
                : "wallets"
              : wizEstimate === 1
                ? "recipient"
                : "recipients"
          }`
        : wizIsPush
          ? "Wallet-reachable contacts"
          : "Your selected audience";

    let delivery = "Immediately";
    if (!wizIsPush && sendOption === "schedule") {
      const date = form.getValues("scheduleDate");
      const time = form.getValues("scheduleTime");
      if (date && time) {
        const { hour, minute } = parseTimeOfDay(time);
        const utc = zonedWallTimeToUtcDate(
          {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hour,
            minute,
          },
          activeTimezone
        );
        delivery = `${new Intl.DateTimeFormat("en-US", {
          timeZone: activeTimezone,
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(utc)} ${activeTimezone}`;
      } else {
        delivery = "Scheduled";
      }
    }

    return [
      {
        label: "Campaign",
        value: wizSummary.campaignName.trim() || "Untitled campaign",
      },
      { label: "Channel", value: wizSummary.channel },
      { label: "Recipients", value: recipients },
      { label: "Delivery", value: delivery },
    ];
  }, [
    wizEstimate,
    wizIsPush,
    wizSummary.campaignName,
    wizSummary.channel,
    sendOption,
    form,
    activeTimezone,
  ]);

  return (
    <div className="min-h-screen bg-background font-sans -mt-[20px] z-2">
      <SendConfirmDialog
        open={showSendConfirm}
        onOpenChange={setShowSendConfirm}
        title={
          !wizIsPush && sendOption === "schedule"
            ? "Schedule this campaign?"
            : "Send this campaign?"
        }
        description={
          wizIsPush
            ? "This delivers an in-app push to the wallets below."
            : sendOption === "schedule"
              ? "It will send automatically at the scheduled time."
              : "This sends to the recipients below right away."
        }
        details={sendConfirmDetails}
        confirmLabel={
          !wizIsPush && sendOption === "schedule" ? "Schedule" : "Send now"
        }
        confirmingLabel={
          !wizIsPush && sendOption === "schedule" ? "Scheduling…" : "Sending…"
        }
        confirming={isLaunching}
        onConfirm={performLaunch}
      />
      {/* Header - Campaigns link · editable name · saved status + Save & exit */}
      <div className="bg-background">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 max-w-[1600px]">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={PRIVATE_ROUTES.CAMPAIGNS}
              className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeftIcon aria-hidden="true" className="size-4" />
              Campaigns
            </Link>
            <span className="text-border" aria-hidden="true">
              |
            </span>
            {isEditingName ? (
              <input
                autoFocus
                value={form.watch("campaignName") ?? ""}
                onChange={(e) =>
                  form.setValue("campaignName", e.target.value, {
                    shouldDirty: true,
                  })
                }
                onBlur={() => {
                  setIsEditingName(false);
                  persistCampaignName();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setIsEditingName(false);
                    persistCampaignName();
                  } else if (e.key === "Escape") {
                    setIsEditingName(false);
                  }
                }}
                aria-label="Campaign name"
                className="min-w-0 flex-1 border-b border-primary bg-transparent text-lg font-semibold text-foreground outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="group flex min-w-0 items-center gap-2"
              >
                <span className="truncate text-lg font-semibold text-foreground">
                  {form.watch("campaignName") || "Untitled campaign"}
                </span>
                <PencilIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                />
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {campaignId ? (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckIcon aria-hidden="true" className="size-4 text-primary" />
                Draft saved
              </span>
            ) : null}
            <Link
              href={PRIVATE_ROUTES.CAMPAIGNS}
              className="text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              Save &amp; exit
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
            {!showConfirmation ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,320px)] lg:items-start lg:gap-8">
                <WizardStepRail
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
                <div className="min-w-0">
                  <div className="rounded-2xl border border-border bg-card shadow-sm transition-all duration-300">
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
                          !isBootstrappingCampaign &&
                          // Don't autosync over an audience/tracking load that
                          // failed and left the form at empty defaults.
                          audienceHydrationOk
                        }
                        tags={audienceTagsQuery.data ?? []}
                        lists={audienceListsQuery.data ?? []}
                        segments={audienceSegmentsQuery.data ?? []}
                        segmentsLoading={audienceSegmentsQuery.isLoading}
                        segmentsError={
                          audienceSegmentsQuery.error instanceof Error
                            ? audienceSegmentsQuery.error.message
                            : null
                        }
                        onEstimateChange={setWizEstimate}
                      />
                    )}
                    {currentStep === 2 &&
                      // Hold the Message step until the campaign has hydrated:
                      // `channel` defaults to email and only flips to in-app
                      // once `getCampaign` resolves, so rendering early flashes
                      // the wrong composer on a cold reload of a push draft.
                      (isHydratingCampaign ? (
                        <div
                          aria-busy="true"
                          aria-label="Loading message"
                          className="space-y-4"
                        >
                          <div className="h-6 w-44 animate-pulse rounded bg-muted" />
                          <div className="grid grid-cols-2 gap-3">
                            <div className="h-20 animate-pulse rounded-xl bg-muted" />
                            <div className="h-20 animate-pulse rounded-xl bg-muted" />
                          </div>
                          <div className="h-24 animate-pulse rounded-lg bg-muted" />
                          <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
                        </div>
                      ) : wizIsPush ? (
                        <InAppMessageStep
                          form={form}
                          appDomain={pushAppDomain}
                          brandMark={pushBrandMark}
                        />
                      ) : (
                        <TemplateStep
                          form={form}
                          campaignId={campaignId}
                          verifiedSenderIdentities={verifiedSenderIdentities}
                          senderIdentitiesLoading={
                            senderIdentitiesQuery.isLoading
                          }
                          canSendEmail={canSendEmail}
                        />
                      ))}
                    {currentStep === 3 && (
                      <CampaignPreviewStep
                        form={form}
                        campaignId={campaignId}
                        canLaunch={
                          canLaunchCampaigns &&
                          !isBootstrappingCampaign &&
                          // Launch saves content + template from the form; block
                          // until the saved content loaded successfully so a
                          // launch can't persist an empty over it.
                          !isHydratingCampaign &&
                          contentHydrationOk
                        }
                        onEditStep={setCurrentStep}
                        estimatedRecipients={wizEstimate}
                        appDomain={pushAppDomain}
                        brandMark={pushBrandMark}
                      />
                    )}

                    {/* Navigation. The final step owns the send-timing actions
                      and the send button, so its footer only navigates back. */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 sm:px-6">
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

                      {currentStep < TOTAL_STEPS ? (
                        <Button
                          type="button"
                          onClick={handleNext}
                          disabled={
                            !campaignId ||
                            isBootstrappingCampaign ||
                            isHydratingCampaign ||
                            // Continue persists from the form (audience on step
                            // 1, content on step 2), so block until the load it
                            // would overwrite succeeded.
                            (currentStep === 1
                              ? !audienceHydrationOk
                              : !contentHydrationOk)
                          }
                          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 transition-all duration-300 ease-in-out hover:shadow-lg"
                        >
                          Continue
                          <ArrowRightIcon
                            aria-hidden="true"
                            className="ml-2 h-4 w-4"
                          />
                        </Button>
                      ) : (
                        (() => {
                          const sendIsPush =
                            form.watch("channel") === "in-app-push";
                          const sendIsScheduled =
                            form.watch("sendOption") === "schedule";
                          const submitting = form.formState.isSubmitting;
                          const canSend =
                            canLaunchCampaigns &&
                            !isBootstrappingCampaign &&
                            !isHydratingCampaign &&
                            contentHydrationOk;
                          const audienceLabel =
                            wizEstimate !== null
                              ? `${wizEstimate.toLocaleString()} ${
                                  sendIsPush
                                    ? wizEstimate === 1
                                      ? "wallet"
                                      : "wallets"
                                    : wizEstimate === 1
                                      ? "recipient"
                                      : "recipients"
                                }`
                              : "your audience";
                          return (
                            <Button
                              type="submit"
                              disabled={!campaignId || !canSend || submitting}
                              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 transition-all duration-300 ease-in-out hover:shadow-lg"
                            >
                              {submitting ? (
                                <>
                                  <ArrowPathIcon
                                    aria-hidden="true"
                                    className="mr-2 h-4 w-4 animate-spin"
                                  />
                                  {sendIsScheduled ? "Scheduling…" : "Sending…"}
                                </>
                              ) : (
                                <>
                                  {sendIsScheduled && !sendIsPush
                                    ? `Schedule for ${audienceLabel}`
                                    : `Send to ${audienceLabel}`}
                                  {sendIsScheduled && !sendIsPush ? (
                                    <ClockIcon
                                      aria-hidden="true"
                                      className="ml-2 h-4 w-4"
                                    />
                                  ) : (
                                    <PaperAirplaneIcon
                                      aria-hidden="true"
                                      className="ml-2 h-4 w-4"
                                    />
                                  )}
                                </>
                              )}
                            </Button>
                          );
                        })()
                      )}
                    </div>
                  </div>
                </div>
                <WizardSummary
                  estimatedRecipients={wizEstimate}
                  estimateLabel={
                    wizIsPush ? "Estimated wallets" : "Estimated recipients"
                  }
                  rows={wizPushRows}
                  channel={wizSummary.channel}
                  sender={wizSummary.sender}
                  template={wizSummary.template}
                  delivery={wizSummary.delivery}
                  smartSending={Boolean(form.watch("smartSending"))}
                />
              </div>
            ) : (
              <div className="mx-auto max-w-3xl">
                <div className="rounded-2xl border border-border bg-card shadow-sm transition-all duration-300">
                  <ConfirmationPage
                    sendOption={sendOption}
                    scheduleDate={scheduleDate}
                    scheduleTime={scheduleTime}
                    timezone={timezone}
                  />
                </div>
              </div>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
