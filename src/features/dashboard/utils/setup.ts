import type {
  DomainAuthMap,
  SenderDomainRecord,
} from "@/features/settings/sender-identities.service";

/*
 * Pure rules behind the Getting started checklist: what counts as done for
 * each live signal, and the line under the count.
 */

/**
 * True only for an explicit verified status. Checks pending/failed markers
 * first so raw backend values like `PENDING_VERIFICATION` never read as
 * verified.
 */
export const isVerifiedStatus = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toUpperCase();
  if (normalized.includes("PEND") || normalized.includes("FAIL")) return false;
  return normalized.includes("VERIF");
};

export const hasVerifiedDomain = (
  domains: SenderDomainRecord[],
  authMap: DomainAuthMap
): boolean => {
  if (domains.some((row) => isVerifiedStatus(row.status))) return true;
  for (const state of authMap.values()) {
    if (state.status === "verified") return true;
    if (state.dkim === true && state.spf === true) return true;
  }
  return false;
};

/** A wallet sync has finished at least once (a running or failed one has not). */
export const hasSynced = (status: { state?: unknown } | null | undefined) =>
  status?.state === "completed";

/**
 * The encouragement under the count. Short, and it stops once there is
 * nothing left to do (the panel removes itself then anyway).
 */
export function setupNudge(done: number, total: number): string {
  if (done === 0) return "Let’s go!";
  if (done >= total) return "All done.";
  if (done >= total - 1) return "Almost there!";
  return "Keep it up!";
}
