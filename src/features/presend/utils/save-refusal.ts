import type { EditorSaveBlockCheck } from "../contracts/editor-messages";
import type { PresendCheck } from "../contracts/presend";
import type { EmailSaveBlock } from "./email-save-block";
import { parsePresendError, PRESEND_BLOCKED } from "./presend-errors";

/**
 * A save the backend refused because the content trips a pre-send block
 * (422 `PRESEND_BLOCKED`; backend `presend-check/API.md`, 2026-11-21: only
 * `URL_SHORTENER` and `SEED_PHRASE_REQUEST` can block a save). Turned into the
 * same `EmailSaveBlock` the hosted editor's `EMAIL_SAVE_BLOCKED` postMessage
 * produces, so the built-in editor feeds the shared store directly.
 */

const linksOf = (check: PresendCheck): string[] => {
  const raw = check.details?.links;
  return Array.isArray(raw)
    ? [...new Set(raw.filter((l): l is string => typeof l === "string"))]
    : [];
};

const toBlockCheck = (check: PresendCheck): EditorSaveBlockCheck => {
  const links = linksOf(check);
  return {
    code: check.code,
    message: check.message,
    ...(check.fix ? { fix: check.fix } : {}),
    ...(links.length > 0 ? { links } : {}),
  };
};

/**
 * The save block an error carries, or null for any other error (those keep
 * their ordinary "Not saved" handling). Only the blocking checks are kept:
 * the editor cannot acknowledge warns, and passes are noise here.
 */
export function saveBlockFromError(
  error: unknown,
  ids: { campaignId?: string; designId?: string },
  source: EmailSaveBlock["source"]
): EmailSaveBlock | null {
  const parsed = parsePresendError(error);
  if (parsed?.kind !== "blocked") return null;
  const blocking = parsed.checks.filter((c) => c.outcome === "block");
  if (blocking.length === 0) return null;
  const details = (error as { details?: unknown } | null)?.details;
  const body =
    details && typeof details === "object"
      ? (details as Record<string, unknown>)
      : {};
  const rulesetVersion =
    typeof body.rulesetVersion === "string" ? body.rulesetVersion : undefined;
  return {
    ...(ids.campaignId ? { campaignId: ids.campaignId } : {}),
    ...(ids.designId ? { designId: ids.designId } : {}),
    source,
    code: PRESEND_BLOCKED,
    // The headline is built from the codes; the checks carry the backend copy.
    message: saveBlockHeadline(blocking.map((c) => c.code)),
    ...(rulesetVersion ? { rulesetVersion } : {}),
    checks: blocking.map(toBlockCheck),
  };
}

/**
 * Identity of a block for "has anything changed": codes plus their links,
 * order-free. Autosave re-prompts only when this changes.
 */
export const saveBlockSignature = (block: EmailSaveBlock | null): string =>
  block
    ? block.checks
        .map((c) => `${c.code}:${[...(c.links ?? [])].sort().join(",")}`)
        .sort()
        .join("|")
    : "";

const REASON: Record<string, string> = {
  URL_SHORTENER: "contains a link shortener",
  SEED_PHRASE_REQUEST: "asks for a seed phrase or private key",
};

/** "this email can't go out while it contains a link shortener", etc. */
export function saveBlockHeadline(codes: readonly string[]): string {
  const reasons = [...new Set(codes)].map(
    (c) => REASON[c] ?? "fails a content check"
  );
  const unique = [...new Set(reasons)];
  return `this email can't go out while it ${unique.join(" and ")}`;
}

/** Every offending link across the block's checks, de-duplicated. */
export const saveBlockLinks = (block: EmailSaveBlock | null): string[] =>
  block ? [...new Set(block.checks.flatMap((c) => c.links ?? []))] : [];
