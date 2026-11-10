/**
 * Where a workspace starts (2.7, 7 Nov 2026): what the team has today. Asked
 * once, in onboarding, or on the first-run Home for a workspace that was set
 * up before the question existed. The answer orders the setup steps so the
 * first one is that team's quickest win; nothing is locked away by it, and it
 * can be changed.
 *
 * Kept per workspace on this device: there is no backend field for it yet, and
 * it only decides an order, so losing it costs one click.
 */
export type StartPath = "people" | "site" | "chain";

export const isStartPath = (v: unknown): v is StartPath =>
  v === "people" || v === "site" || v === "chain";

const keyFor = (orgId: string) => `onchain.startPath:${orgId}`;
const CHANGED = "onchain:start-path-changed";
/** Onboarding finishes before the org id is known to it everywhere; see below. */
const PENDING_KEY = "onchain.startPath:pending";

export function readStartPath(orgId: string | null): StartPath | null {
  if (!orgId) return null;
  try {
    const own = window.localStorage.getItem(keyFor(orgId));
    if (isStartPath(own)) return own;
    // The wizard's answer, stamped at completion: adopt it for this workspace.
    const pending = window.localStorage.getItem(PENDING_KEY);
    if (isStartPath(pending)) {
      window.localStorage.setItem(keyFor(orgId), pending);
      window.localStorage.removeItem(PENDING_KEY);
      return pending;
    }
  } catch {
    // Storage blocked: Home just asks the question.
  }
  return null;
}

export function saveStartPath(
  orgId: string | null,
  path: StartPath | null
): void {
  if (!orgId) return;
  try {
    if (path) window.localStorage.setItem(keyFor(orgId), path);
    else window.localStorage.removeItem(keyFor(orgId));
  } catch {
    // Storage blocked: the answer lasts until the page reloads.
  }
  window.dispatchEvent(new Event(CHANGED));
}

/** Called by the wizard on completion, when the answer is known but Home is not open yet. */
export function stampPendingStartPath(path: StartPath | ""): void {
  if (!path) return;
  try {
    window.localStorage.setItem(PENDING_KEY, path);
  } catch {
    // Storage blocked: Home asks again.
  }
}

/** For `useSyncExternalStore`: other tabs (storage) and this one (our event). */
export function subscribeStartPath(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}
