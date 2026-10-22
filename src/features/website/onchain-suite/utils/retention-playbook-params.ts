import { CATEGORIES } from "@/onchain-suite-website/data/retention-playbook";
import type { CategoryId } from "@/onchain-suite-website/types/retention-playbook";

const CATEGORY_IDS: readonly CategoryId[] = CATEGORIES.map((c) => c.id);

type RawParam = string | string[] | undefined;

function first(raw: RawParam): string {
  return (Array.isArray(raw) ? raw[0] : raw) ?? "";
}

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value);
}

/**
 * The category a page anchor belongs to: "defi" and "defi-retention-triggers"
 * both open the DeFi playbook. Anything else returns null.
 */
export function categoryOfAnchor(anchor: string): CategoryId | null {
  const value = anchor.trim().toLowerCase();
  return (
    CATEGORY_IDS.find((id) => value === id || value.startsWith(`${id}-`)) ??
    null
  );
}

/** Reads `?category=` (or a URL hash without the #) into a known category. */
export function parseCategory(raw: RawParam): CategoryId | null {
  const value = first(raw).trim().toLowerCase();
  return isCategoryId(value) ? value : null;
}

/** Where the playbooks live: the landing page, with one page per sector under it. */
export const PLAYBOOK_BASE = "/retention-playbook";

/** Path of a sector's page, e.g. "/retention-playbook/perp-dexes". */
export function playbookPath(category: CategoryId): string {
  const slug = CATEGORIES.find((c) => c.id === category)?.slug ?? category;
  return `${PLAYBOOK_BASE}/${slug}`;
}

/** The strategy's PDF, exported by scripts/export-playbook-pdfs.sh into public/. */
export function playbookPdfPath(category: CategoryId): string {
  const slug = CATEGORIES.find((c) => c.id === category)?.slug ?? category;
  return `/playbooks/${slug}.pdf`;
}

/** The category a page slug names: "perp-dexes" is the perp DEX playbook. */
export function categoryOfSlug(slug: string): CategoryId | null {
  return CATEGORIES.find((c) => c.slug === slug)?.id ?? null;
}
