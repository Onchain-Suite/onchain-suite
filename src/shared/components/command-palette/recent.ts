import { GROUP_ICON, GROUP_ORDER, type PaletteGroup } from "./palette-data";
import type { PaletteRow } from "./palette-model";

/* The last few records opened from ⌘K, shown when nothing is typed. Per
 * browser, a convenience only: storage can be missing or full, so every read
 * and write is guarded and the palette works without it. */

const KEY = "ocs-palette-recent";
export const MAX_RECENT = 5;

interface StoredRecent {
  key: string;
  group: PaletteGroup;
  title: string;
  sub?: string;
  href: string;
}

const isStored = (v: unknown): v is StoredRecent => {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.key === "string" &&
    typeof r.title === "string" &&
    typeof r.href === "string" &&
    r.href.startsWith("/") &&
    GROUP_ORDER.includes(r.group as PaletteGroup)
  );
};

/** Rows from a stored JSON string; anything malformed is dropped. */
export function parseRecent(raw: string | null): PaletteRow[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isStored)
      .slice(0, MAX_RECENT)
      .map((r) => ({
        key: `recent:${r.key}`,
        group: "Recent" as const,
        title: r.title,
        sub: r.sub,
        icon: GROUP_ICON[r.group],
        href: r.href,
        record: true,
      }));
  } catch {
    return [];
  }
}

/** The stored list with `row` moved to the front. */
export function withRecent(raw: string | null, row: PaletteRow): string {
  const key = row.key.replace(/^recent:/, "");
  let list: StoredRecent[] = [];
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed.filter(isStored);
  } catch {
    list = [];
  }
  // A recent re-opened keeps its original group (its icon), not "Recent".
  const previous = list.find((r) => r.key === key);
  const group =
    row.group === "Recent" ? (previous?.group ?? "Contacts") : row.group;
  const next: StoredRecent = {
    key,
    group,
    title: row.title,
    sub: row.sub,
    href: row.href,
  };
  return JSON.stringify(
    [next, ...list.filter((r) => r.key !== key)].slice(0, MAX_RECENT)
  );
}

export function readRecent(): PaletteRow[] {
  try {
    return parseRecent(window.localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export function rememberRecent(row: PaletteRow): void {
  try {
    window.localStorage.setItem(
      KEY,
      withRecent(window.localStorage.getItem(KEY), row)
    );
  } catch {
    // Storage blocked or full: recents are a convenience, skip it.
  }
}
