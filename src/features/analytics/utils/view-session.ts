/**
 * Anonymous per-visit id for the published-dashboard view beacon, so a reload is
 * not counted as a new view. No PII. Guarded: a blocked storage just yields a
 * fresh id each call (counts a reload as a view, never throws).
 */
const KEY = "ons.dash.sid";

export function viewSessionId(): string {
  const fresh = () =>
    (
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    ).slice(0, 64);
  try {
    const existing = window.sessionStorage.getItem(KEY);
    if (existing) return existing;
    const sid = fresh();
    window.sessionStorage.setItem(KEY, sid);
    return sid;
  } catch {
    return fresh();
  }
}
