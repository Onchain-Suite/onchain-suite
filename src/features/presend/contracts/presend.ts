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
   * greyed out, not as a green tick. On an automation (backend 2026-11-21):
   * `steps` lists EVERY Send Email node id at this check's worst outcome, in
   * graph order, and `nodeId` is the first of them (message/fix are its).
   */
  details?: {
    skipped?: string;
    nodeId?: string;
    steps?: string[];
  } & Record<string, unknown>;
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

/**
 * `GET /automations/{id}/presend-check?graph=`. `draft` (backend default) is
 * what `POST /publish` checks; `saved` is what resuming an existing graph
 * (`PUT /status {status:"active"}`) checks. Same evaluator as the gate.
 */
export type AutomationPresendGraph = "draft" | "saved";

/**
 * One entry of a 422's `errors[]` (and `POST /campaigns/{id}/validate`'s
 * `errors`). Pre-send blocks appear here AND in `checks[]`; the copies here
 * carry `source: "presend"` so a client rendering `checks[]` drops them
 * (backend 2026-11-21). No `source` = an ordinary validation error.
 */
export interface PresendValidationError {
  code?: string;
  message?: string;
  source?: "presend" | (string & {});
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
  errors?: PresendValidationError[];
  checks?: PresendCheck[];
  presend?: PresendResult;
}
