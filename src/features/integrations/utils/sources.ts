import type { ConnectionSummary } from "../contracts/connections";
import { connectorFor } from "../data/connectors";
import { MIGRATIONS } from "../data/migrations";
import { FALLBACK_IDS, SETUP_DOC_BASE, SOURCES } from "../data/sources";
import type {
  DataSource,
  Migration,
  MigrationCategory,
  SourceKind,
  SourceStatus,
} from "../types/sources";

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

export const migrationsOfCategory = (
  category: MigrationCategory
): Migration[] => MIGRATIONS.filter((m) => m.category === category);

/**
 * What a migration card can promise before anything starts. A tool with no
 * importer comes in as a file the person exports, so it never claims that
 * everything comes across: what the export holds is up to the tool.
 */
export type MigrationCoverage = "file" | "partial" | "full";

export function migrationCoverage(
  m: Migration,
  hasImporter: boolean
): MigrationCoverage {
  if (m.category === "file" || !hasImporter) return "file";
  return m.leaves ? "partial" : "full";
}

/** Sources that are real without a connector: the events API and file import. */
const BUILT_IN_ROUTES = new Set(["csv", "sdk", "webhook-in"]);

/**
 * A source's live status. Contracts are connected once any is indexed; a
 * backend connector is connected once its credential verifies; a catalog
 * entry with no connector behind it reads as "soon", whatever the catalog
 * hoped, so nothing offers a connect that cannot happen.
 */
export function sourceStatus(
  source: DataSource,
  connections: ConnectionSummary[] | undefined,
  contractCount: number
): SourceStatus {
  if (source.id === "contracts") {
    return contractCount > 0 ? "connected" : "available";
  }
  const def = connectorFor(source.id);
  if (def) {
    return connections?.some((c) => c.connector === def.id && c.verified)
      ? "connected"
      : "available";
  }
  return BUILT_IN_ROUTES.has(source.id) ? source.status : "soon";
}
