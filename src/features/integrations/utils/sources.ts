import {
  FALLBACK_IDS,
  MIGRATIONS,
  SETUP_DOC_BASE,
  SOURCES,
} from "../data/sources";
import type { DataSource, Migration, SourceKind } from "../types/sources";

/** How many connectors a category holds. Directories read as a menu unless they
 *  are honest about scale, so the categories carry their own counts. */
export const sourceCount = (kind: SourceKind): number =>
  SOURCES.filter((s) => s.kind === kind).length;

export const sourcesOfKind = (kind: SourceKind): DataSource[] =>
  SOURCES.filter((s) => s.kind === kind);

/** Match on name, alias and what it gives, so someone typing "cdp" or "excel"
 *  finds something. Empty query returns everything. */
export function searchSources(q: string): DataSource[] {
  const t = q.trim().toLowerCase();
  if (!t) return SOURCES;
  return SOURCES.filter((s) =>
    [s.name, ...(s.aka ?? []), s.gives].some((v) => v.toLowerCase().includes(t))
  );
}

/** The two universal fallbacks (inbound webhook + SDK), in order. */
export const fallbackSources = (): DataSource[] =>
  FALLBACK_IDS.map((id) => SOURCES.find((s) => s.id === id)).filter(
    (s): s is DataSource => Boolean(s)
  );

export const setupDocUrl = (id: string): string =>
  `https://${SETUP_DOC_BASE}/${id}.md`;

export const searchMigrations = (q: string): Migration[] => {
  const t = q.trim().toLowerCase();
  if (!t) return MIGRATIONS;
  return MIGRATIONS.filter((m) =>
    `${m.name} ${m.brings}`.toLowerCase().includes(t)
  );
};
