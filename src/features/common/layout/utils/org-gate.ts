/**
 * Whether the dashboard shell has an organization to render pages for.
 *
 * The shell used to decide this from the selection cookie sampled once after
 * mount, plus the session. When the cookie was written a moment later (the
 * switcher copies the session's active org into it on a fresh browser session,
 * where the session cookie has expired but the sign-in has not), nothing told
 * the shell, so it sat on its loading skeleton until something else happened
 * to re-render it: a tab switch, a reload. `confirmedOrgId` is the switcher's
 * own reactive view of the same fact, so the shell follows it.
 */
export function hasActiveOrg(input: {
  /** Cookie and session agreed at render time. */
  confirmedBySession: boolean;
  /** The selection cookie as last sampled by the shell (mount, or an org event). */
  selectedOrgId: string | null;
  /** The switcher's confirmed org: cookie and active org agree. Reactive. */
  confirmedOrgId: string | null;
  /** A switch is in flight: the old org's pages must not render against it. */
  isSwitchingOrg: boolean;
}): boolean {
  if (input.confirmedBySession) return true;
  if (input.isSwitchingOrg) return false;
  return Boolean(input.selectedOrgId) || Boolean(input.confirmedOrgId);
}
