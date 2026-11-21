/**
 * Pre-send check contract (backend `src/modules/presend-check/API.md`).
 *
 * The same result shape comes back from `GET /campaigns/{id}/presend-check`,
 * embedded as `presend` in `POST /campaigns/{id}/validate` and
 * `GET /campaigns/{id}/send-preflight`, and inside the 409/422 error bodies of
 * the launch, publish, activate and builder-save routes.
 */

export type PresendOutcome = "pass" | "warn" | "block";

/** Codes that always block. They cannot be acknowledged. */
export type PresendBlockCode =
  | "SENDER_NOT_VERIFIED"
  | "DKIM_NOT_PASSING"
  | "DMARC_MULTIPLE_RECORDS"
  | "UNSUBSCRIBE_HEADERS_UNAVAILABLE"
  | "URL_SHORTENER"
  | "SEED_PHRASE_REQUEST";

/** Codes that warn and need an explicit acknowledgement to send. */
export type PresendWarnCode =
  | "DMARC_MISSING"
  | "DMARC_NOT_ENFORCED"
  | "SPF_TOO_MANY_LOOKUPS"
  | "MAIL_FROM_NOT_SET"
  | "GMAIL_CLIP"
  | "CRYPTO_PHISHING_PHRASE"
  | "NEW_LINK_DOMAIN"
  | "NEVER_MAILED_SHARE";

/**
 * Known codes. `POSTAL_ADDRESS_REQUIRED` warns before its grace date and blocks
 * after, so read `outcome`, never infer it from the code. The `string` arm
 * keeps a newer backend's code renderable instead of a type error.
 */
export type PresendCode =
  | PresendBlockCode
  | PresendWarnCode
  | "POSTAL_ADDRESS_REQUIRED"
  | (string & {});

export interface PresendCheck {
  code: PresendCode;
  outcome: PresendOutcome;
  /** Backend copy: what is wrong. Show it as-is. */
  message: string;
  /** Backend copy: how to fix it. Present on warn and block. */
  fix?: string;
  /**
   * Free-form evidence. `skipped` (string) on a pass means OUR lookup failed
   * (DNS timeout, RDAP down) and the check passed without evidence - show it
   * greyed out, not as a green tick. `nodeId` names the failing Send Email
   * node on an automation.
   */
  details?: { skipped?: string; nodeId?: string } & Record<string, unknown>;
}

export interface PresendResult {
  /** No check blocked. Warns are allowed. */
  ok: boolean;
  /** At least one check blocked. */
  blocked: boolean;
  rulesetVersion: string;
  /** "legacy" only when the backend's PRESEND_CHECK_ENABLED=false. */
  mode?: "full" | "legacy";
  /** Every code that applies, passes included, in a fixed order. */
  checks: PresendCheck[];
}

/** Body field accepted by every gated route. Must list EVERY current warn. */
export interface PresendAckBody {
  acknowledgedWarnings?: string[];
}

/**
 * 409 body (inside the error envelope's `details`). `checks` is every warn,
 * `missing` the warn codes this request did not acknowledge.
 */
export interface PresendAckRequiredBody {
  code: "PRESEND_ACK_REQUIRED";
  message?: string;
  rulesetVersion?: string;
  missing?: string[];
  checks?: PresendCheck[];
  presend?: PresendResult;
}

/**
 * 422 body. Campaign launch keeps `VALIDATION_FAILED` and adds `checks`
 * (blocking) next to the older `errors[]`; automations use
 * `PRESEND_BLOCKED`.
 */
export interface PresendBlockedBody {
  code: "VALIDATION_FAILED" | "PRESEND_BLOCKED";
  message?: string;
  rulesetVersion?: string;
  errors?: Array<{ code?: string; message?: string }>;
  checks?: PresendCheck[];
  presend?: PresendResult;
}
