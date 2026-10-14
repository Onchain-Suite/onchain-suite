/**
 * Connector catalog domain types (v2.7). UI/domain types, not wire contracts -
 * the catalog is static data (see ../data/sources.ts), not a backend response.
 *
 * Organising rule for the whole screen: data is what comes IN (sources), and the
 * sending channels are what goes OUT. Identity is the join key: without a
 * wallet-to-person link, product events and on-chain events are two datasets
 * about the same person with no way to become one record.
 */

export type SourceKind = "wallet-auth" | "file" | "pipe" | "chain" | "product";

/** Connector lifecycle: already connected, connectable now, or on the roadmap. */
export type SourceStatus = "connected" | "available" | "soon";

/**
 * How fresh the data is, which is not a preference: a nightly export cannot fire
 * a Loop the moment someone acts, and the UI says so at connect time.
 */
export type Freshness = "live" | "scheduled" | "one-off";

/** What a source contributes to the join - the thing that decides whether it is
 *  worth connecting at all. */
export type Lane = "identity" | "product" | "chain" | "list";

/** Semantic icon key per source kind; the UI maps it to a Heroicon so the data
 *  layer stays free of React. */
export type SourceKindIcon =
  | "fingerprint"
  | "network"
  | "clipboard-list"
  | "square-mouse-pointer"
  | "arrow-left-right";

export interface SourceKindMeta {
  id: SourceKind;
  label: string;
  desc: string;
  icon: SourceKindIcon;
}

export interface DataSource {
  id: string;
  name: string;
  kind: SourceKind;
  status: SourceStatus;
  freshness: Freshness;
  lane: Lane;
  /** What it actually gives us: the reason to connect it, in one line. */
  gives: string;
  /** Alternative spellings people type when searching. */
  aka?: string[];
  /** The vendor's own domain, which is where its icon comes from. Absent for
   *  anything we build ourselves (those use the product's own mark). */
  domain?: string;
  /** Who wrote the integration. A connector we maintain and one the vendor
   *  maintains fail differently, so it is stated per source. */
  by?: string;
  /** Longer than `gives`: what the detail page leads with. */
  about?: string;
  /** What actually happens once it is connected, as steps rather than prose. */
  how?: string[];
  /** What the person has to do at their end, for whoever does the integration. */
  configure?: string;
}

/**
 * Coming from another tool. Connecting a source and migrating off a tool are
 * different jobs: a source is something you add, a migration is something you
 * leave. So each migration states what comes across and what does not.
 */
export interface Migration {
  id: string;
  name: string;
  /** What actually comes across. Named per tool because it genuinely differs. */
  brings: string;
  /** What does not, stated rather than discovered. */
  leaves?: string;
}
