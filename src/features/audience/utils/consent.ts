import type {
  ConsentView,
  ImportConsentDeclaration,
} from "../contracts/consent";

/**
 * The opt-in sources an importer can pick. A bought, rented or scraped list
 * is deliberately absent: nobody on it agreed to hear from the sender, and
 * mailing it is what gets a sending domain blocked.
 */
export const CONSENT_SOURCE_OPTIONS = [
  { value: "website_form", label: "A signup form on our website" },
  { value: "checkout_signup", label: "Checkout or account signup" },
  { value: "event", label: "At an event, in person or online" },
  { value: "other", label: "Another way (describe it)" },
] as const;

export type ConsentSourceChoice =
  (typeof CONSENT_SOURCE_OPTIONS)[number]["value"];

/** What the opt-in form holds while the importer fills it in. */
export interface ConsentDraft {
  source: ConsentSourceChoice | "";
  /** Free text, used when `source` is "other". */
  otherSource: string;
  /** `YYYY-MM-DD` from a date input, or "". */
  obtainedAt: string;
  proof: string;
  doubleOptIn: boolean;
}

export const EMPTY_CONSENT_DRAFT: ConsentDraft = {
  source: "",
  otherSource: "",
  obtainedAt: "",
  proof: "",
  doubleOptIn: false,
};

const SOURCE_MAX = 200;
const PROOF_MAX = 2000;

const todayIso = (now: Date) => now.toISOString().slice(0, 10);

/** Why the draft can't be sent yet, or null when it can. */
export function consentDraftError(
  d: ConsentDraft,
  now: Date = new Date()
): string | null {
  if (!d.source) return "Choose how these contacts opted in.";
  if (d.source === "other") {
    const t = d.otherSource.trim();
    if (!t) return "Describe how these contacts opted in.";
    if (t.length > SOURCE_MAX)
      return `Keep the description under ${SOURCE_MAX} characters.`;
  }
  if (d.obtainedAt) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(d.obtainedAt) ||
      Number.isNaN(Date.parse(d.obtainedAt))
    )
      return "That opt-in date isn't valid.";
    if (d.obtainedAt > todayIso(now))
      return "The opt-in date can't be in the future.";
  }
  if (d.proof.trim().length > PROOF_MAX)
    return `Keep the proof under ${PROOF_MAX} characters.`;
  return null;
}

/** The wire declaration for a valid draft (call `consentDraftError` first). */
export function toConsentDeclaration(
  d: ConsentDraft
): ImportConsentDeclaration {
  const label =
    d.source === "other"
      ? d.otherSource.trim()
      : (CONSENT_SOURCE_OPTIONS.find((o) => o.value === d.source)?.label ?? "");
  const proof = d.proof.trim();
  return {
    source: label.slice(0, SOURCE_MAX),
    ...(d.obtainedAt ? { obtainedAt: d.obtainedAt } : {}),
    ...(proof ? { proof } : {}),
    ...(d.doubleOptIn ? { doubleOptIn: true } : {}),
  };
}

const SOURCE_LABELS: Record<string, string> = {
  import: "Imported",
  api: "Added through the API",
  event: "Custom event",
  form: "Signup form",
  form_submission: "Signup form",
  admin: "Added by support",
};

/** "integration:mailchimp" → "Migrated from Mailchimp"; known kinds get a plain label. */
export function consentSourceLabel(v: ConsentView): string {
  const raw = (v.consentSource ?? "").trim();
  if (raw.startsWith("integration:")) {
    const name = raw.slice("integration:".length);
    const pretty = name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
    return pretty ? `Migrated from ${pretty}` : "Migrated from another tool";
  }
  if (v.storedAs === "form_submission") return SOURCE_LABELS.form_submission;
  return SOURCE_LABELS[raw] ?? (raw || "Unknown source");
}

/** The opt-in date for display, or "Date unknown" when the backend had no real date. */
export function consentDateLabel(
  v: ConsentView,
  locale: string | undefined = undefined
): string {
  if (!v.consentAtKnown || !v.consentAt) return "Date unknown";
  const t = Date.parse(v.consentAt);
  if (Number.isNaN(t)) return "Date unknown";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(t));
}
