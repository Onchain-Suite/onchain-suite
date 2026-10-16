export type DomainStatus = "verified" | "pending" | "failed";

/**
 * Classifies a backend domain status string into the three UI states.
 *
 * Substring matching on "verif" is a trap: the backend's intermediate states
 * ("VERIFICATION_IN_PROGRESS", "VERIFICATION_NOT_STARTED") and "unverified" all
 * contain it, so a naive `includes("verif")` marks a domain still being checked
 * as Verified. We therefore classify intermediate/not-yet states FIRST, then
 * failures, and only then treat an explicit success token as verified.
 */
export function normalizeDomainStatus(raw: unknown): DomainStatus {
  const s =
    typeof raw === "string"
      ? raw
          .trim()
          .toLowerCase()
          .replace(/[\s_-]/g, "")
      : "";
  if (!s) return "pending";

  // Not-yet / in-flight states. Several contain "verif" and must not read as
  // verified. "unverified" is here too (it also matches "verified" below).
  if (
    s.includes("pend") ||
    s.includes("progress") ||
    s.includes("notstart") ||
    s.includes("checking") ||
    s.includes("queue") ||
    s.includes("processing") ||
    s.includes("awaiting") ||
    s.includes("unverified")
  ) {
    return "pending";
  }

  // Failures. "invalid" is matched before the "valid" success token below.
  if (
    s.includes("fail") ||
    s.includes("error") ||
    s.includes("invalid") ||
    s.includes("reject") ||
    s.includes("denied") ||
    s.includes("declin")
  ) {
    return "failed";
  }

  if (
    s.includes("verified") ||
    s.includes("success") ||
    s.includes("active") ||
    s.includes("complete") ||
    s.includes("valid") ||
    s === "ok" ||
    s === "done" ||
    s === "true"
  ) {
    return "verified";
  }

  return "pending";
}
