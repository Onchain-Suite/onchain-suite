import {
  askHref,
  type CreateItem,
  type Destination,
  GROUP_ICON,
  GROUP_ORDER,
  type PaletteGroup,
} from "./palette-data";
import type { IconSvgElement } from "@/shared/components/common/hugeicon";

/* The palette's logic, kept free of React and the network so it can be
 * tested on its own: what rows to show for a query, and in what order. */

export interface PaletteRow {
  key: string;
  group: PaletteGroup;
  title: string;
  sub?: string;
  icon: IconSvgElement;
  href: string;
  /** A record (contact, campaign...) rather than a page; opening one remembers it. */
  record?: boolean;
  /** Matched by the server (it searched fields we cannot see), so it is kept even
   *  when the title does not contain the query. */
  serverMatched?: boolean;
}

/** Best rows shown per group. */
export const PER_GROUP = 5;

/** Higher is better: an exact hit beats a prefix, which beats a word start, which beats a substring. */
export function score(hay: string, query: string): number {
  const h = hay.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return 0;
  if (h === q) return 3;
  if (h.startsWith(q)) return 2;
  if (h.split(/[\s@._/-]+/).some((w) => w.startsWith(q))) return 1.5;
  return h.includes(q) ? 1 : 0;
}

const bestOf = (query: string, fields: (string | undefined | null)[]) =>
  Math.max(
    0,
    ...fields.filter((f): f is string => Boolean(f)).map((f) => score(f, query))
  );

export interface PaletteSources {
  recent: PaletteRow[];
  records: PaletteRow[];
  creates: CreateItem[];
  destinations: Destination[];
}

const createRow = (c: CreateItem): PaletteRow => ({
  key: `create:${c.href}`,
  group: "Create",
  title: `New ${c.label.toLowerCase()}`,
  sub: c.hint,
  icon: c.icon,
  href: c.href,
});

const destinationRow = (d: Destination): PaletteRow => ({
  key: `go:${d.href}`,
  group: "Go to",
  title: d.label,
  icon: d.icon,
  href: d.href,
});

/** The ask row, offered for anything typed: the palette is the one door to Intelligence. */
export const askRow = (question: string): PaletteRow => ({
  key: "ask",
  group: "Ask",
  title: `Ask Intelligence: “${question}”`,
  sub: "Answers about your contacts and what they did, in plain English",
  icon: GROUP_ICON.Ask,
  href: askHref(question),
});

/**
 * The rows for a query. With nothing typed: where you were lately, what you
 * can make, and where you can go. Typed: the best few hits per group in a
 * fixed group order, then always the offer to ask Intelligence.
 */
export function buildRows(
  rawQuery: string,
  sources: PaletteSources
): PaletteRow[] {
  const query = rawQuery.trim();
  if (!query) {
    return [
      ...sources.recent,
      ...sources.creates.map(createRow),
      ...sources.destinations.map(destinationRow),
    ];
  }

  const hits: { row: PaletteRow; s: number }[] = [];
  for (const row of sources.records) {
    const s = bestOf(query, [row.title, row.sub]);
    if (s > 0) hits.push({ row, s });
    else if (row.serverMatched) hits.push({ row, s: 0.5 });
  }
  for (const c of sources.creates) {
    const s = bestOf(query, [`new ${c.label}`, `create ${c.label}`, c.label]);
    if (s > 0) hits.push({ row: createRow(c), s });
  }
  for (const d of sources.destinations) {
    const s = bestOf(query, [d.label, ...(d.keywords ?? [])]);
    if (s > 0) hits.push({ row: destinationRow(d), s });
  }

  const byGroup = new Map<PaletteGroup, { row: PaletteRow; s: number }[]>();
  for (const hit of hits) {
    const list = byGroup.get(hit.row.group) ?? [];
    // One row per key: a record found by two sources shows once.
    if (!list.some((h) => h.row.key === hit.row.key)) list.push(hit);
    byGroup.set(hit.row.group, list);
  }

  const out: PaletteRow[] = [];
  for (const group of GROUP_ORDER) {
    const list = byGroup.get(group);
    if (!list) continue;
    out.push(
      ...list
        .sort((a, b) => b.s - a.s)
        .slice(0, PER_GROUP)
        .map((h) => h.row)
    );
  }
  out.push(askRow(query));
  return out;
}

/* ------------------------------------------------------------------ */
/* Turning API responses into rows                                     */
/* ------------------------------------------------------------------ */

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;

/** The array inside `[...]`, `{ items }` or `{ data }` (list endpoints vary). */
export function itemsOf(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  if (isObject(res)) {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.data)) return res.data;
    if (isObject(res.data) && Array.isArray(res.data.items))
      return res.data.items;
  }
  return [];
}

/** `{ id, name, status }` from any list item that has an id and a name. */
export function namedItems(
  res: unknown
): { id: string; name: string; status?: string }[] {
  return itemsOf(res).flatMap((item) => {
    if (!isObject(item)) return [];
    const id = str(item.id);
    const name = str(item.name) ?? str(item.title);
    return id && name ? [{ id, name, status: str(item.status) }] : [];
  });
}

/** A status word for a subtitle: "active" -> "Active". */
export const statusLabel = (status?: string) =>
  status
    ? `${status.charAt(0).toUpperCase()}${status.slice(1).toLowerCase()}`
    : "";

export const shortAddress = (address: string) =>
  address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;

/**
 * How a contact reads in the palette. Wallet-first: a contact with no email
 * is a full contact, named by its ENS or its short address.
 */
export function contactRow(profile: unknown): PaletteRow | null {
  if (!isObject(profile)) return null;
  const id = str(profile.id);
  if (!id) return null;
  const email = str(profile.email);
  const name = str(profile.name);
  const ens = str(profile.ens) ?? str(profile.ensName);
  const wallet = str(profile.walletAddress) ?? str(profile.wallet);
  const title =
    name ?? ens ?? email ?? (wallet ? shortAddress(wallet) : "Contact");
  const sub =
    [
      email && email !== title ? email : undefined,
      wallet ? shortAddress(wallet) : undefined,
    ]
      .filter(Boolean)
      .join(" · ") || "Contact";
  return {
    key: `contact:${id}`,
    group: "Contacts",
    title,
    sub,
    icon: GROUP_ICON.Contacts,
    href: `/audience/${encodeURIComponent(id)}`,
    record: true,
    serverMatched: true,
  };
}
