/**
 * Consent contracts (backend `modules/consent/API.md`, 2026-11-22).
 */

/**
 * The batch declaration every CSV import and beehiiv/Klaviyo/Mailchimp
 * migration must carry. CSV multipart: inside the `options` JSON, NOT a
 * separate multipart field. Missing → 400 `IMPORT_CONSENT_REQUIRED`; a bad
 * date → 400 `IMPORT_CONSENT_DATE_INVALID`.
 */
export interface ImportConsentDeclaration {
  /** How these contacts opted in, in the importer's words (max 200). */
  source: string;
  /** One opt-in date for the batch (ISO). Per-row opt_in_date / consent_date / opted_in_at columns win. */
  obtainedAt?: string;
  /** Free text or a URL proving it (max 2000). */
  proof?: string;
  /** The wording they agreed to (max 2000). */
  text?: string;
  doubleOptIn?: boolean;
}

/** One consent record, from `GET /audience/profiles/:id/consent`. */
export interface ConsentView {
  id: string;
  /** "import", "api", "form", "integration:mailchimp", … */
  consentSource: string | null;
  /** The importer's own words ("Website newsletter form"), when given. */
  consentMethod: string | null;
  consentAt: string | null;
  /** false = no real date was known; `consentAt` is when it was recorded. */
  consentAtKnown: boolean;
  consentText: string | null;
  consentProof: string | null;
  consentIp: string | null;
  doubleOptIn: boolean;
  originId: string | null;
  recordedAt: string | null;
  /** "form_submission" = read from a capture-form submission, not a record row. */
  storedAs: "record" | "form_submission";
}

export interface ContactConsent {
  contactId: string;
  current: ConsentView | null;
  records: ConsentView[];
}
