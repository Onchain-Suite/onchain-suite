/**
 * Maps an import failure to a specific, human message. The audience service now
 * keeps the HTTP `status` and backend `code` on the thrown Error (see
 * `audience.service.ts`), so this branches on those first and falls back to
 * substring matching for the large-file direct-upload path (which bakes
 * `HTTP <status>` into the message) and the client-side pre-flight guards.
 *
 * Pure and dependency-free so it is unit-tested without rendering the 2.5k-line
 * import component.
 */

/** The error shape this reads - a superset of what the service attaches. */
export interface ImportErrorLike {
  status?: number;
  code?: string;
  message?: string;
  cause?: unknown;
}

/**
 * Which flow failed. The "upgrade" flow (POST /billing/checkout/import-upgrade)
 * fails on checkout/billing, NOT on the file, so its generic fallback must not
 * tell the user to "check your file" - that sent people back to re-checking a
 * CSV that was fine. Defaults to "import" so existing callers are unchanged.
 */
export interface ImportErrorOptions {
  context?: "import" | "upgrade";
}

const asRecord = (value: unknown): ImportErrorLike =>
  value && typeof value === "object" ? (value as ImportErrorLike) : {};

/** Message text from the error and its cause, upper-cased for matching. */
const matchText = (error: unknown): string => {
  const e = asRecord(error);
  const causeMessage =
    e.cause instanceof Error
      ? e.cause.message
      : (asRecord(e.cause).message ?? "");
  return `${e.message ?? ""} ${causeMessage ?? ""}`.toUpperCase();
};

export function importErrorMessage(
  error: unknown,
  options?: ImportErrorOptions
): string {
  const e = asRecord(error);
  const status = typeof e.status === "number" ? e.status : undefined;
  const code = (typeof e.code === "string" ? e.code : "").toUpperCase();
  const text = matchText(error);
  const has = (token: string) => code.includes(token) || text.includes(token);

  // Upgrade-checkout failures (POST /billing/checkout/import-upgrade). These are
  // billing problems, not file problems, so they get their own specific copy
  // and never fall through to the file-oriented generic below.
  if (
    has("FIAT_CHECKOUT_UNAVAILABLE") ||
    has("CARD CHECKOUT IS NOT CONFIGURED")
  )
    return "Card payments aren't available for this workspace right now. Use the crypto checkout to upgrade, or contact support - your import stays held until you do.";
  if (has("FITS WITHIN YOUR CURRENT PLAN"))
    return "This import already fits your current plan, so no upgrade is needed. Close this and choose Import anyway.";
  if (has("FAILED TO CREATE CARD CHECKOUT"))
    return "We couldn't start the card checkout. Please try again in a moment, or use the crypto checkout instead.";

  // Client-side pre-flight guards (thrown by the component with these codes).
  if (has("IMPORT_LIST_REQUIRED"))
    return "Choose a list for these contacts before importing.";
  if (has("IMPORT_CHAIN_REQUIRED"))
    return "Choose the chain these wallets should be enriched on before importing.";
  if (has("IMPORT_LIST_NOT_FOUND"))
    return "That list no longer exists. Pick another one or create a new list.";

  // Payment / pay-as-you-go: HTTP 402, or a PAYG / plan-limit code.
  if (
    status === 402 ||
    has("PAYG") ||
    has("PLAN_LIMIT") ||
    has("PAYMENT_REQUIRED")
  )
    return "This import needs a funded balance or a higher plan. Top up your pay-as-you-go wallet or upgrade your plan, then try again.";

  // Contact-limit / duplicate conflict: HTTP 409.
  if (status === 409 || has("CONTACT_LIMIT"))
    return "This import would go over your plan's contact limit. Upgrade your plan or import fewer contacts.";

  // File too large: HTTP 413, or a size message from the direct-upload path.
  if (
    status === 413 ||
    has("HTTP 413") ||
    has("TOO LARGE") ||
    has("FILE TOO LARGE")
  )
    return "That file is too large to import here. Split it into smaller files (under 4MB) and try again.";

  // Unsupported file type.
  if (has("UNSUPPORTED FILE") || has("UNSUPPORTED_FILE"))
    return "That file type isn't supported. Upload a .csv or .json file.";

  // Session / auth: HTTP 401 / 403.
  if (status === 401 || status === 403 || has("HTTP 401") || has("HTTP 403"))
    return "Your session expired. Refresh the page and try the import again.";

  // Server error: own it, and note that it was reported (the backend captures
  // 5xx on the request path to Sentry).
  if (status !== undefined && status >= 500)
    return "Something went wrong on our side while starting the import. We've been notified - please try again in a moment.";

  // The upgrade flow fails on billing, not the file - don't send people back to
  // re-check a CSV that was fine.
  if (options?.context === "upgrade")
    return "We couldn't start the upgrade checkout. Please try again, or use the crypto checkout instead.";

  return "We couldn't start the import. Please check your file and try again.";
}
