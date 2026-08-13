/**
 * @file Notification presentation registry: maps a backend notification
 * `type` discriminator (SCREAMING_SNAKE_CASE, e.g. `PLAN_ACTIVATED`) to a
 * unique icon + tone, and decides which events collapse into a single grouped
 * row (e.g. a burst of contact-import notifications shown as one).
 *
 * Icons are explicit per-icon Heroicons imports (tree-shaken) - never a dynamic
 * "all icons" registry (see CLAUDE.md section 5).
 */
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  BellAlertIcon,
  BoltIcon,
  BuildingOffice2Icon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  MegaphoneIcon,
  PaperAirplaneIcon,
  RocketLaunchIcon,
  ShieldExclamationIcon,
  SparklesIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type NotificationTone = "info" | "success" | "warning" | "danger";

export interface NotificationEventMeta {
  icon: IconComponent;
  tone: NotificationTone;
  /**
   * When set, notifications of this event that arrive in a burst collapse into
   * a single row labelled with the plural noun (e.g. "3 imports"). Left unset
   * for one-off events (billing, domains) that should each stand alone.
   */
  group?: { one: string; many: string };
}

/**
 * Explicit registry keyed on the backend notification `type`. Covers the events
 * the backend emits today plus forward-looking domain events it is expected to
 * emit; unknown types fall back to the prefix + severity resolvers below.
 */
const EVENT_META: Record<string, NotificationEventMeta> = {
  // Workspace / onboarding
  ORGANIZATION_CREATED: { icon: BuildingOffice2Icon, tone: "success" },
  ONBOARDING_COMPLETED: { icon: RocketLaunchIcon, tone: "success" },

  // Sending domains
  DOMAIN_CREATED: { icon: GlobeAltIcon, tone: "info" },
  DOMAIN_VERIFIED: { icon: CheckBadgeIcon, tone: "success" },

  // Billing & payments
  BILLING_CHECKOUT_CREATED: { icon: CreditCardIcon, tone: "info" },
  FIAT_CHECKOUT_CREATED: { icon: CreditCardIcon, tone: "info" },
  PLAN_ACTIVATED: { icon: ArrowTrendingUpIcon, tone: "success" },
  PAYMENT_METHOD_ADDED: { icon: CreditCardIcon, tone: "success" },
  PAYMENT_METHOD_DEFAULT_SET: { icon: CreditCardIcon, tone: "info" },
  PAYMENT_METHOD_DELETED: { icon: CreditCardIcon, tone: "warning" },

  // Usage / limits
  USAGE_LIMIT_WARNING: { icon: ExclamationTriangleIcon, tone: "warning" },
  PLAN_LIMIT_EXCEEDED: { icon: ShieldExclamationIcon, tone: "danger" },
  PAYG_BALANCE_EXHAUSTED: { icon: BanknotesIcon, tone: "danger" },

  // Audience (groupable - imports/exports/contacts arrive in bursts)
  AUDIENCE_IMPORT_STARTED: {
    icon: ArrowUpTrayIcon,
    tone: "info",
    group: { one: "import", many: "imports" },
  },
  AUDIENCE_IMPORT_COMPLETED: {
    icon: ArrowUpTrayIcon,
    tone: "success",
    group: { one: "import", many: "imports" },
  },
  AUDIENCE_EXPORT_CREATED: {
    icon: ArrowDownTrayIcon,
    tone: "info",
    group: { one: "export", many: "exports" },
  },
  AUDIENCE_UPDATED: { icon: UsersIcon, tone: "info" },
  CONTACT_CREATED: {
    icon: UsersIcon,
    tone: "info",
    group: { one: "contact", many: "contacts" },
  },

  // Campaigns
  CAMPAIGN_SENT: {
    icon: PaperAirplaneIcon,
    tone: "success",
    group: { one: "campaign", many: "campaigns" },
  },
  CAMPAIGN_LAUNCHED: {
    icon: MegaphoneIcon,
    tone: "success",
    group: { one: "campaign", many: "campaigns" },
  },
  CAMPAIGN_SCHEDULED: { icon: ClockIcon, tone: "info" },

  // Automations
  AUTOMATION_DISPATCHED: { icon: BoltIcon, tone: "success" },
};

/**
 * Namespace fallback: an unknown `type` is mapped by its prefix so a brand-new
 * backend event still gets a sensible domain icon rather than a generic bell.
 */
const PREFIX_META: ReadonlyArray<readonly [RegExp, NotificationEventMeta]> = [
  [
    /^(AUDIENCE_IMPORT|IMPORT)/,
    {
      icon: ArrowUpTrayIcon,
      tone: "info",
      group: { one: "import", many: "imports" },
    },
  ],
  [
    /^(AUDIENCE_EXPORT|EXPORT)/,
    {
      icon: ArrowDownTrayIcon,
      tone: "info",
      group: { one: "export", many: "exports" },
    },
  ],
  [/^SYNC/, { icon: ArrowPathIcon, tone: "info" }],
  [
    /^(AUDIENCE|CONTACT|WALLET|SEGMENT|LIST)/,
    { icon: UsersIcon, tone: "info" },
  ],
  [/^CAMPAIGN/, { icon: MegaphoneIcon, tone: "info" }],
  [/^(AUTOMATION|FLOW)/, { icon: BoltIcon, tone: "info" }],
  [/^FORM/, { icon: ClipboardDocumentListIcon, tone: "info" }],
  [/^DOMAIN/, { icon: GlobeAltIcon, tone: "info" }],
  [
    /^(BILLING|PAYMENT|FIAT|INVOICE|CHECKOUT)/,
    {
      icon: CreditCardIcon,
      tone: "info",
    },
  ],
  [
    /^(PLAN|USAGE|PAYG|QUOTA|LIMIT)/,
    {
      icon: ArrowTrendingUpIcon,
      tone: "warning",
    },
  ],
  [
    /^(ORGANIZATION|ONBOARDING|WORKSPACE|MEMBER|INVITE|TEAM)/,
    { icon: BuildingOffice2Icon, tone: "info" },
  ],
];

/** Severity words the backend also uses as a bare `type` on generic rows. */
const SEVERITY_META: Record<string, NotificationEventMeta> = {
  info: { icon: SparklesIcon, tone: "info" },
  success: { icon: CheckCircleIcon, tone: "success" },
  warning: { icon: ExclamationTriangleIcon, tone: "warning" },
  error: { icon: ShieldExclamationIcon, tone: "danger" },
  danger: { icon: ShieldExclamationIcon, tone: "danger" },
  message: { icon: BellAlertIcon, tone: "info" },
};

const FALLBACK_META: NotificationEventMeta = {
  icon: BellAlertIcon,
  tone: "info",
};

/** Resolve the icon + tone (+ optional grouping) for a notification `type`. */
export function resolveNotificationMeta(
  type: string | undefined
): NotificationEventMeta {
  const key = type?.trim();
  if (!key) return FALLBACK_META;

  const exact = EVENT_META[key];
  if (exact) return exact;

  const severity = SEVERITY_META[key.toLowerCase()];
  if (severity) return severity;

  const upper = key.toUpperCase();
  for (const [pattern, meta] of PREFIX_META) {
    if (pattern.test(upper)) return meta;
  }

  return FALLBACK_META;
}

/** Icon-tile classes per tone (semantic primary token for info; theme-aware). */
export const NOTIFICATION_TONE_TILE: Record<NotificationTone, string> = {
  info: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
  danger: "bg-red-500/10 text-red-600 dark:text-red-500",
};
