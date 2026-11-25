/**
 * Cookie consent state (PECR / UK GDPR).
 *
 * The visitor's choice is kept in one first-party cookie, `ocs_consent`, which
 * is itself strictly necessary (it remembers the choice). It is shared across
 * *.onchainsuite.com so www and app ask once.
 *
 * Categories:
 * - analytics:  Google Analytics 4 cookies, Databuddy, PostHog storage.
 * - recordings: session replay and heatmaps (Microsoft Clarity, Databuddy replay).
 *
 * Nothing non-essential loads or stores anything until the matching category is
 * granted. No choice yet means everything is off and the banner shows.
 */

export const CONSENT_COOKIE = "ocs_consent";
/** Bump when the categories change, so everyone is asked again. */
export const CONSENT_VERSION = 1;
/** ICO guidance: ask again after a reasonable period. */
const MAX_AGE_DAYS = 180;

export interface ConsentChoice {
  analytics: boolean;
  recordings: boolean;
}

export interface StoredConsent extends ConsentChoice {
  v: number;
  /** When the choice was made (ms since epoch). */
  at: number;
}

export const OPEN_PREFERENCES_EVENT = "ocs:consent-preferences";
const CHANGE_EVENT = "ocs:consent-change";

/** Parse the cookie value; anything unreadable or out of date counts as no choice. */
export function parseConsent(
  raw: string | undefined | null
): StoredConsent | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Partial<StoredConsent>;
    if (v.v !== CONSENT_VERSION) return null;
    return {
      v: CONSENT_VERSION,
      at: Number(v.at) || 0,
      analytics: v.analytics === true,
      recordings: v.recordings === true,
    };
  } catch {
    return null;
  }
}

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  return hit ? hit.slice(CONSENT_COOKIE.length + 1) : null;
}

/** Cookie domain: share across onchainsuite.com subdomains, host-only elsewhere. */
function cookieDomain(): string {
  const host = window.location.hostname;
  return host === "onchainsuite.com" || host.endsWith(".onchainsuite.com")
    ? "; domain=.onchainsuite.com"
    : "";
}

let cached: StoredConsent | null | undefined;

export function getConsent(): StoredConsent | null {
  if (cached === undefined) cached = parseConsent(readCookie());
  return cached;
}

export function saveConsent(choice: ConsentChoice): void {
  const previous = getConsent();
  const value: StoredConsent = {
    v: CONSENT_VERSION,
    at: Date.now(),
    ...choice,
  };
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
    JSON.stringify(value)
  )}; path=/; max-age=${MAX_AGE_DAYS * 86_400}; samesite=lax${cookieDomain()}${secure}`;
  cached = value;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: value }));

  // A script that already ran cannot be unloaded. If something granted before
  // is now withdrawn, reload so the trackers stop for the rest of the visit.
  const withdrew =
    (previous?.analytics === true && !value.analytics) ||
    (previous?.recordings === true && !value.recordings);
  if (withdrew) {
    clearTrackerCookies();
    window.location.reload();
  }
}

export function subscribeConsent(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

/** Reopen the banner on the preferences view (footer "Cookie settings"). */
export function openConsentPreferences(): void {
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}

/** Best-effort removal of analytics cookies already set, after a withdrawal. */
function clearTrackerCookies(): void {
  const names = document.cookie
    .split("; ")
    .map((c) => c.split("=")[0])
    .filter((n) => /^(_ga|_gid|_gat|_clck|_clsk|ph_)/.test(n));
  const host = window.location.hostname;
  const domains = ["", `; domain=${host}`, cookieDomain()];
  for (const n of names) {
    for (const d of domains) {
      document.cookie = `${n}=; path=/; max-age=0${d}`;
    }
  }
}

/**
 * Inline script for <head>: Google Consent Mode defaults, read from the stored
 * choice so a returning visitor who accepted is counted from the first hit.
 * Runs before gtag.js loads. Kept dependency-free (plain ES5).
 */
export const CONSENT_DEFAULTS_SCRIPT = `(function(){window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=window.gtag||gtag;var a=false;try{var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/);if(m){var c=JSON.parse(decodeURIComponent(m[1]));a=c.v===${CONSENT_VERSION}&&c.analytics===true;}}catch(e){}gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:a?"granted":"denied",wait_for_update:500});})();`;
