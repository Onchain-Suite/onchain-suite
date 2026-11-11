/**
 * What to do with the selected workspace once the list of workspaces the
 * person really belongs to is known. Membership changes on the server (a
 * workspace is deleted, someone is removed), so the stored selection is only
 * ever a guess until it is checked against that list.
 */
export type SelectionFix =
  /** The stored selection is one of their workspaces: nothing to do. */
  | { kind: "keep" }
  /** It is not, but another workspace is: move them there. */
  | { kind: "switch"; orgId: string }
  /** It is not, and there is nowhere to go: drop it, so the shell shows setup. */
  | { kind: "clear" };

const clean = (value: string | null | undefined): string =>
  typeof value === "string" ? value.trim() : "";

export function reconcileSelection(input: {
  /** Ids of the workspaces the person belongs to, as the server just said. */
  orgIds: string[];
  /** The selection stored in the browser. */
  cookieOrgId: string | null | undefined;
  /** The session's active workspace, the first fallback. */
  sessionOrgId: string | null | undefined;
}): SelectionFix {
  const cookie = clean(input.cookieOrgId);
  if (cookie && input.orgIds.includes(cookie)) return { kind: "keep" };

  const session = clean(input.sessionOrgId);
  const [first] = input.orgIds;
  const next = session && input.orgIds.includes(session) ? session : first;
  if (next) return { kind: "switch", orgId: next };

  return cookie ? { kind: "clear" } : { kind: "keep" };
}

/**
 * The workspaces that were in the list a moment ago and are gone now: deleted,
 * or the person was removed from them. Named so the switch can say why it
 * happened instead of moving someone without a word.
 */
export function goneWorkspaces<T extends { id: string }>(
  before: T[],
  after: T[]
): T[] {
  const still = new Set(after.map((o) => o.id));
  return before.filter((o) => !still.has(o.id));
}
