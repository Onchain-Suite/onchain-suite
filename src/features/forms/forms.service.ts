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
  allowedOrigins?: string[];
  fields?: CaptureFieldSpec[];
  settings?: Record<string, unknown>;
  zkEnabled?: boolean;
}

export interface UpdateFormInput {
  name?: string;
  tag?: string | null;
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
  if (isJsonObject(root) && Array.isArray(root.data)) return root.data as T[];
  return [];
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
      const items = extractItems<FormSubmission>(payload);
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
}

export const DEFAULT_TIMING: FormTiming = {
  pages: "All pages",
  trigger: "load",
  delay: 5,
  scroll: 50,
  freq: "Once per visitor",
};

export const DEFAULT_META: FormMeta = {
  style: "inline",
  template: null,
  type: "identity",
  surface: "widget",
  timing: { ...DEFAULT_TIMING },
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
  return {
    style,
    template: TEMPLATE_IDS.has(meta.template as FormTemplateId)
      ? (meta.template as FormTemplateId)
      : null,
    type: meta.type === "lead" ? "lead" : "identity",
    surface,
    timing: {
      pages:
        typeof rawTiming.pages === "string"
          ? rawTiming.pages
          : DEFAULT_TIMING.pages,
      trigger: TRIGGERS.has(rawTiming.trigger as FormTrigger)
        ? (rawTiming.trigger as FormTrigger)
        : DEFAULT_TIMING.trigger,
      delay:
        typeof rawTiming.delay === "number"
          ? rawTiming.delay
          : DEFAULT_TIMING.delay,
      scroll:
        typeof rawTiming.scroll === "number"
          ? rawTiming.scroll
          : DEFAULT_TIMING.scroll,
      freq:
        typeof rawTiming.freq === "string"
          ? rawTiming.freq
          : DEFAULT_TIMING.freq,
    },
  };
}

/** Merge edited form meta back into the opaque settings blob. */
export function writeFormMeta(
  settings: Record<string, unknown> | undefined,
  meta: FormMeta
): Record<string, unknown> {
  return { ...(settings ?? {}), meta: { ...meta, timing: { ...meta.timing } } };
}
