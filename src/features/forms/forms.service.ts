import type { AxiosError, AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import type {
  FormCaptureType,
  FormStyleId,
  FormSurface,
  FormTemplateId,
} from "./forms.catalog";

/**
 * Field kinds a capture form can collect. Wallet-first: `wallet` is the
 * identity (Connect wallet), the rest are optional channel handles / inputs.
 * `consent` renders the opt-in checkbox.
 */
export type CaptureFieldType =
  "wallet" | "email" | "text" | "x" | "farcaster" | "consent";

/** Presentation config for the hosted form (stored under `settings.display`). */
export interface FormDisplaySettings {
  brandName?: string;
  headline?: string;
  description?: string;
  submitLabel?: string;
  consentLabel?: string;
  successMessage?: string;
  accent?: string;
  /** Show the "verified with a zero-knowledge proof" reassurance line. */
  showZkNote?: boolean;
}

/** A capture form (Email-to-Wallet), as returned by the backend `present()`. */
export interface CaptureForm {
  id: string;
  name: string;
  publicToken: string;
  status: "active" | "paused" | "archived" | string;
  fields: CaptureFieldSpec[];
  settings: Record<string, unknown>;
  allowedOrigins: string[];
  apiConnected: boolean;
  zkEnabled: boolean;
  tag: string | null;
  /** Audience list (segment) every capture is added to. */
  listId: string | null;
  submissionCount: number;
  lastSubmissionAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Public submit URL + copy-paste embed snippet. */
  submitUrl: string;
  embedCode: string;
}

export interface CaptureFieldSpec {
  key: string;
  label?: string;
  type?: CaptureFieldType;
  required?: boolean;
}

/** One captured submission (list view / Submissions tab). */
export interface FormSubmission {
  id: string;
  formId: string;
  /** Wallet-first: the primary identity for the submission. */
  walletAddress: string | null;
  /** Per-field captured values, keyed by field key (email, x, farcaster…). */
  data: Record<string, unknown>;
  /** Channels the wallet linked through this form. */
  channels: string[];
  /** Whether the wallet signature / ZK proof verified. */
  verified: boolean;
  createdAt: string;
}

export interface SubmissionsPage {
  items: FormSubmission[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateFormInput {
  name: string;
  tag?: string;
  /** Audience list (segment) every capture joins; null/omit = unbound. */
  listId?: string | null;
  allowedOrigins?: string[];
  fields?: CaptureFieldSpec[];
  settings?: Record<string, unknown>;
  zkEnabled?: boolean;
}

export interface UpdateFormInput {
  name?: string;
  tag?: string | null;
  listId?: string | null;
  allowedOrigins?: string[];
  fields?: CaptureFieldSpec[];
  settings?: Record<string, unknown>;
  status?: string;
  zkEnabled?: boolean;
}

const pickOrgId = (orgId?: string) =>
  orgId ?? getSelectedOrganizationId() ?? null;

const extractData = <T>(payload: unknown): T => {
  if (isJsonObject(payload) && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
};

const request = async <T>(
  config: AxiosRequestConfig,
  orgId?: string
): Promise<T> => {
  const resolvedOrgId = pickOrgId(orgId);
  const headers = {
    ...(config.headers ?? {}),
    ...(resolvedOrgId ? { "x-org-id": resolvedOrgId } : {}),
    "x-onchain-silent-error": "1",
  };

  try {
    const res = await apiClient.request<T>({ ...config, headers });
    return extractData<T>(res.data);
  } catch (e) {
    const err = e as AxiosError<unknown>;
    const data = err.response?.data;
    const nestedError =
      isJsonObject(data) && isJsonObject(data.error) ? data.error : undefined;
    const message = isJsonObject(nestedError)
      ? nestedError.message
      : isJsonObject(data)
        ? data.message
        : typeof data === "string"
          ? data
          : (err.message ?? "Forms request failed");
    throw new Error(String(message), { cause: e });
  }
};

const extractItems = <T>(payload: unknown): T[] => {
  const root = extractData<unknown>(payload);
  if (Array.isArray(root)) return root as T[];
  if (isJsonObject(root) && Array.isArray(root.items)) return root.items as T[];
  if (isJsonObject(root) && Array.isArray(root.submissions))
    return root.submissions as T[];
  if (isJsonObject(root) && Array.isArray(root.data)) return root.data as T[];
  return [];
};

// Field keys that represent a reachable channel (vs a plain profile field), so
// we can derive the submission's channel chips when the backend doesn't send an
// explicit `channels` array.
const CHANNEL_FIELD_KEYS = new Set([
  "email",
  "x",
  "twitter",
  "farcaster",
  "telegram",
  "discord",
]);

/**
 * Normalize one raw submission row into `FormSubmission`. The backend contract
 * (forms-endpoints.md #7) returns `{ values, walletVerified }`; older/assumed
 * shapes used `{ data, verified, channels }`. Accept either, and derive
 * `channels` from the captured field keys when absent.
 */
const normalizeSubmission = (
  raw: unknown,
  fallbackFormId: string
): FormSubmission | null => {
  if (!isJsonObject(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) return null;

  const values = isJsonObject(raw.values)
    ? (raw.values as Record<string, unknown>)
    : isJsonObject(raw.data)
      ? (raw.data as Record<string, unknown>)
      : {};

  const verified =
    typeof raw.walletVerified === "boolean"
      ? raw.walletVerified
      : typeof raw.verified === "boolean"
        ? raw.verified
        : false;

  const channels = Array.isArray(raw.channels)
    ? raw.channels.filter((c): c is string => typeof c === "string")
    : Object.keys(values).filter((k) =>
        CHANNEL_FIELD_KEYS.has(k.toLowerCase())
      );

  return {
    id,
    formId: typeof raw.formId === "string" ? raw.formId : fallbackFormId,
    walletAddress:
      typeof raw.walletAddress === "string" ? raw.walletAddress : null,
    data: values,
    channels,
    verified,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
  };
};

/** Typed client for the Email-to-Wallet capture-forms API. */
export const formsService = {
  listForms(orgId?: string) {
    return request<unknown>({ method: "GET", url: "/forms" }, orgId).then((r) =>
      extractItems<CaptureForm>(r)
    );
  },

  getForm(id: string, orgId?: string) {
    return request<CaptureForm>({ method: "GET", url: `/forms/${id}` }, orgId);
  },

  createForm(body: CreateFormInput, orgId?: string) {
    return request<CaptureForm>(
      { method: "POST", url: "/forms", data: body },
      orgId
    );
  },

  updateForm(id: string, body: UpdateFormInput, orgId?: string) {
    return request<CaptureForm>(
      { method: "PATCH", url: `/forms/${id}`, data: body },
      orgId
    );
  },

  /** Connect the form to the API - auto-enables ZK encryption on captures. */
  connectForm(id: string, orgId?: string) {
    return request<CaptureForm>(
      { method: "POST", url: `/forms/${id}/connect` },
      orgId
    );
  },

  deleteForm(id: string, orgId?: string) {
    return request<{ deleted: boolean }>(
      { method: "DELETE", url: `/forms/${id}` },
      orgId
    );
  },

  /** Paginated submissions for the Submissions tab. */
  listSubmissions(
    id: string,
    { page = 1, limit = 25 }: { page?: number; limit?: number } = {},
    orgId?: string
  ) {
    return request<unknown>(
      {
        method: "GET",
        url: `/forms/${id}/submissions`,
        params: { page, limit },
      },
      orgId
    ).then((payload): SubmissionsPage => {
      const items = extractItems<unknown>(payload)
        .map((raw) => normalizeSubmission(raw, id))
        .filter((s): s is FormSubmission => s !== null);
      const root = extractData<unknown>(payload);
      const total =
        isJsonObject(root) && typeof root.total === "number"
          ? root.total
          : items.length;
      return { items, total, page, limit };
    });
  },

  /** Export all submissions as CSV (server streams a file). */
  submissionsCsvUrl(id: string) {
    return `/api/v1/forms/${id}/submissions/export.csv`;
  },
};

/** Sensible defaults for a form's hosted-page presentation. */
export const DEFAULT_DISPLAY: Required<FormDisplaySettings> = {
  brandName: "",
  headline: "Join the waitlist",
  description: "Connect your wallet and link an email to claim your spot.",
  submitLabel: "Verify & join",
  consentLabel:
    "I agree to receive updates and consent to linking my wallet to my contact details. I can unsubscribe any time.",
  successMessage: "You're in - watch your inbox for what's next.",
  accent: "#f97316",
  showZkNote: true,
};

/** Read display settings out of `form.settings.display`, filling defaults. */
export function readDisplaySettings(
  settings: Record<string, unknown> | undefined
): Required<FormDisplaySettings> {
  const display =
    settings && isJsonObject(settings.display) ? settings.display : {};
  const pickStr = (k: keyof FormDisplaySettings, fallback: string) =>
    typeof display[k] === "string" && (display[k] as string).length > 0
      ? (display[k] as string)
      : fallback;
  return {
    brandName: pickStr("brandName", DEFAULT_DISPLAY.brandName),
    headline: pickStr("headline", DEFAULT_DISPLAY.headline),
    description: pickStr("description", DEFAULT_DISPLAY.description),
    submitLabel: pickStr("submitLabel", DEFAULT_DISPLAY.submitLabel),
    consentLabel: pickStr("consentLabel", DEFAULT_DISPLAY.consentLabel),
    successMessage: pickStr("successMessage", DEFAULT_DISPLAY.successMessage),
    accent: pickStr("accent", DEFAULT_DISPLAY.accent),
    showZkNote:
      typeof display.showZkNote === "boolean"
        ? display.showZkNote
        : DEFAULT_DISPLAY.showZkNote,
  };
}

/** Merge edited display settings back into the opaque settings blob. */
export function writeDisplaySettings(
  settings: Record<string, unknown> | undefined,
  display: FormDisplaySettings
): Record<string, unknown> {
  return { ...(settings ?? {}), display: { ...display } };
}

/** When an overlay/hosted form appears (widget timing rules). */
export type FormTrigger = "load" | "delay" | "scroll" | "exit";

export interface FormTiming {
  /** Where the widget shows, e.g. "All pages" / "Homepage only". */
  pages: string;
  trigger: FormTrigger;
  /** Seconds, for the `delay` trigger. */
  delay: number;
  /** Percent, for the `scroll` trigger. */
  scroll: number;
  /** Frequency cap, e.g. "Once per visitor". */
  freq: string;
}

/** Presentation of the form card (theme, corners, button style, hero). */
export type FormBg = "surface" | "tint" | "dark";
export type FormCorners = "sharp" | "md" | "pill";
export type FormButton = "solid" | "outline";

export interface FormAppearance {
  accent: string;
  bg: FormBg;
  corners: FormCorners;
  button: FormButton;
  hero: boolean;
}

/** What happens after a visitor submits. */
export type FormCompletion = "message" | "redirect" | "reveal";

export interface FormAfterSubmit {
  onCompletion: FormCompletion;
  redirectUrl: string;
  enrolAutomation: boolean;
  automationId: string | null;
  automationName: string | null;
}

/**
 * Style/template/surface + behaviour that isn't a first-class backend field.
 * Stored under `settings.meta`; the backend round-trips it untouched.
 */
export interface FormMeta {
  style: FormStyleId;
  template: FormTemplateId | null;
  type: FormCaptureType;
  surface: FormSurface;
  timing: FormTiming;
  appearance: FormAppearance;
  afterSubmit: FormAfterSubmit;
  /** Lead forms only: send a confirmation email before subscribing. */
  doubleOptIn: boolean;
}

export const DEFAULT_TIMING: FormTiming = {
  pages: "All pages",
  trigger: "load",
  delay: 5,
  scroll: 50,
  freq: "Once per visitor",
};

export const DEFAULT_APPEARANCE: FormAppearance = {
  accent: "#FF6828",
  bg: "dark",
  corners: "md",
  button: "solid",
  hero: false,
};

export const DEFAULT_AFTER_SUBMIT: FormAfterSubmit = {
  onCompletion: "message",
  redirectUrl: "",
  enrolAutomation: false,
  automationId: null,
  automationName: null,
};

export const DEFAULT_META: FormMeta = {
  style: "inline",
  template: null,
  type: "identity",
  surface: "widget",
  timing: { ...DEFAULT_TIMING },
  appearance: { ...DEFAULT_APPEARANCE },
  afterSubmit: { ...DEFAULT_AFTER_SUBMIT },
  // Confirmed opt-in is ON by default (matches the backend default). Withheld
  // membership until the subscriber clicks the confirmation link is the only
  // pre-send proof a mailbox is real on accept-all providers, so it protects
  // sender reputation. Users can still turn it off in the builder.
  doubleOptIn: true,
};

const STYLE_IDS = new Set<FormStyleId>([
  "inline",
  "popup",
  "hellobar",
  "slidein",
  "hosted",
]);
const TEMPLATE_IDS = new Set<FormTemplateId>([
  "basic",
  "waitlist",
  "connect",
  "airdrop",
  "newsletter",
]);
const TRIGGERS = new Set<FormTrigger>(["load", "delay", "scroll", "exit"]);
const BGS = new Set<FormBg>(["surface", "tint", "dark"]);
const CORNERS = new Set<FormCorners>(["sharp", "md", "pill"]);
const BUTTONS = new Set<FormButton>(["solid", "outline"]);
const COMPLETIONS = new Set<FormCompletion>(["message", "redirect", "reveal"]);

const pickStr = (v: unknown, fallback: string) =>
  typeof v === "string" && v.length > 0 ? v : fallback;
const pickNum = (v: unknown, fallback: number) =>
  typeof v === "number" ? v : fallback;
const pickBool = (v: unknown, fallback: boolean) =>
  typeof v === "boolean" ? v : fallback;

/** Read form meta out of `form.settings.meta`, filling defaults. */
export function readFormMeta(
  settings: Record<string, unknown> | undefined
): FormMeta {
  const meta = settings && isJsonObject(settings.meta) ? settings.meta : {};
  const style = STYLE_IDS.has(meta.style as FormStyleId)
    ? (meta.style as FormStyleId)
    : DEFAULT_META.style;
  const surface: FormSurface =
    meta.surface === "hosted" || meta.surface === "widget"
      ? meta.surface
      : style === "hosted"
        ? "hosted"
        : "widget";
  const rawTiming = isJsonObject(meta.timing) ? meta.timing : {};
  const rawApp = isJsonObject(meta.appearance) ? meta.appearance : {};
  const rawAfter = isJsonObject(meta.afterSubmit) ? meta.afterSubmit : {};
  return {
    style,
    template: TEMPLATE_IDS.has(meta.template as FormTemplateId)
      ? (meta.template as FormTemplateId)
      : null,
    type: meta.type === "lead" ? "lead" : "identity",
    surface,
    timing: {
      pages: pickStr(rawTiming.pages, DEFAULT_TIMING.pages),
      trigger: TRIGGERS.has(rawTiming.trigger as FormTrigger)
        ? (rawTiming.trigger as FormTrigger)
        : DEFAULT_TIMING.trigger,
      delay: pickNum(rawTiming.delay, DEFAULT_TIMING.delay),
      scroll: pickNum(rawTiming.scroll, DEFAULT_TIMING.scroll),
      freq: pickStr(rawTiming.freq, DEFAULT_TIMING.freq),
    },
    appearance: {
      accent: pickStr(rawApp.accent, DEFAULT_APPEARANCE.accent),
      bg: BGS.has(rawApp.bg as FormBg)
        ? (rawApp.bg as FormBg)
        : DEFAULT_APPEARANCE.bg,
      corners: CORNERS.has(rawApp.corners as FormCorners)
        ? (rawApp.corners as FormCorners)
        : DEFAULT_APPEARANCE.corners,
      button: BUTTONS.has(rawApp.button as FormButton)
        ? (rawApp.button as FormButton)
        : DEFAULT_APPEARANCE.button,
      hero: pickBool(rawApp.hero, DEFAULT_APPEARANCE.hero),
    },
    afterSubmit: {
      onCompletion: COMPLETIONS.has(rawAfter.onCompletion as FormCompletion)
        ? (rawAfter.onCompletion as FormCompletion)
        : DEFAULT_AFTER_SUBMIT.onCompletion,
      redirectUrl: pickStr(
        rawAfter.redirectUrl,
        DEFAULT_AFTER_SUBMIT.redirectUrl
      ),
      enrolAutomation: pickBool(
        rawAfter.enrolAutomation,
        DEFAULT_AFTER_SUBMIT.enrolAutomation
      ),
      automationId:
        typeof rawAfter.automationId === "string"
          ? rawAfter.automationId
          : null,
      automationName:
        typeof rawAfter.automationName === "string"
          ? rawAfter.automationName
          : null,
    },
    doubleOptIn: pickBool(meta.doubleOptIn, DEFAULT_META.doubleOptIn),
  };
}

/** Merge edited form meta back into the opaque settings blob. */
export function writeFormMeta(
  settings: Record<string, unknown> | undefined,
  meta: FormMeta
): Record<string, unknown> {
  return {
    ...(settings ?? {}),
    meta: {
      ...meta,
      timing: { ...meta.timing },
      appearance: { ...meta.appearance },
      afterSubmit: { ...meta.afterSubmit },
    },
  };
}
