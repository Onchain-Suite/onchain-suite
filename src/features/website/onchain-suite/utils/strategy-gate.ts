/* A client's strategy can sit behind a passcode. The repo is public, so it
   holds only a salted SHA-256 of each passcode. A reader who enters the right
   one keeps it in an httpOnly cookie, and the proxy hashes that cookie on every
   request for the strategy's page or its PDF. Passcodes ignore case and
   surrounding spaces, so a phone's automatic capital does not lock anyone out.
   A new hash: printf 'onchainsuite-strategy:<slug>:<passcode in lower case>' |
   shasum -a 256 */

/* The same paths as strategyPathForSlug and pdfPathForSlug, written out here
   because those helpers import the playbook copy, which the proxy should not
   carry. strategy-gate.test.ts holds the two in step. */
const pagePath = (slug: string) => `/retention-playbook/${slug}`;
const pdfPath = (slug: string) => `/playbooks/${slug}.pdf`;

/** Salted SHA-256 of each gated strategy's passcode, by slug. */
export const STRATEGY_PASSCODE_HASHES: Record<string, string> = {
  yauga: "776e979cc5449867bd6d0b5213c80da32e232f30ecaab870981d7aa03534b61c",
};

/** How long a reader stays in after entering the passcode: 30 days. */
export const STRATEGY_GATE_MAX_AGE = 60 * 60 * 24 * 30;

export const isGatedStrategy = (slug: string) =>
  Object.hasOwn(STRATEGY_PASSCODE_HASHES, slug);

export const strategyGateCookie = (slug: string) => `strategy-${slug}`;

/** The form of a passcode we hash and keep: no case, no surrounding spaces. */
export const normalisePasscode = (passcode: string) =>
  passcode.trim().toLowerCase();

export async function passcodeHash(
  slug: string,
  passcode: string
): Promise<string> {
  const data = new TextEncoder().encode(
    `onchainsuite-strategy:${slug}:${normalisePasscode(passcode)}`
  );
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

export async function passcodeMatches(
  slug: string,
  passcode: string | undefined
): Promise<boolean> {
  const expected = STRATEGY_PASSCODE_HASHES[slug];
  if (!expected || !passcode) return false;
  return (await passcodeHash(slug, passcode)) === expected;
}

/**
 * The gate is always on in production. In development it is off unless
 * STRATEGY_GATE=on, so scripts/export-playbook-pdfs.sh can still print the
 * page from a local server.
 */
export const strategyGateOn = () =>
  process.env.NODE_ENV === "production" || process.env.STRATEGY_GATE === "on";

/** The gated strategy a path belongs to, and whether it is the page or its PDF. */
export function gatedPath(
  pathname: string
): { slug: string; kind: "page" | "pdf" } | undefined {
  const path = pathname.replace(/\/+$/, "");
  for (const slug of Object.keys(STRATEGY_PASSCODE_HASHES)) {
    if (path === pagePath(slug)) return { slug, kind: "page" };
    if (path === pdfPath(slug)) return { slug, kind: "pdf" };
  }
  return undefined;
}
