/**
 * Telling "this workspace is gone, or you are no longer in it" apart from any
 * other refused request.
 *
 * A workspace can be deleted, or a member removed, while their tab sits open
 * on it. Every request then fails the same way, and the shell has no reason to
 * look again at which workspaces exist. The API client reports that one kind
 * of failure here; the workspace switcher listens and re-reads its list.
 */
export const ORG_ACCESS_LOST_EVENT = "onchain:org-access-lost";

/**
 * The backend's organization guard answers 404 "Organization not found" for a
 * deleted workspace, and 403 for a member who was removed or whose membership
 * is not active. A plain 403 for a missing role ("Insufficient permissions")
 * is NOT this: the workspace is still theirs.
 */
export function isOrgAccessLost(status: number, message: unknown): boolean {
  if (typeof message !== "string") return false;
  const text = message.toLowerCase();
  if (status === 404) return text.includes("organization not found");
  if (status === 403) {
    return (
      text.includes("not a member of this organization") ||
      text.includes("membership is not active")
    );
  }
  return false;
}

/** Tell whoever is listening that the selected workspace was refused. */
export function reportOrgAccessLost(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ORG_ACCESS_LOST_EVENT));
}
