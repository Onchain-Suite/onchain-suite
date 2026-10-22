/**
 * What the UI needs to know to connect one backend connector: its credential
 * fields, how it connects, and what it can do once connected. UI types; the
 * wire shapes are in ../contracts/connections.ts.
 */

export interface ConnectorField {
  /** The key the backend reads from the `PUT` body. */
  key: string;
  label: string;
  /** Secrets render as password inputs and are never echoed back. */
  type: "secret" | "text";
  required: boolean;
  hint?: string;
  placeholder?: string;
}

/** What a connected connector can be asked to do. */
export type ConnectorAction =
  /** Cursor-paged identity pull (Privy, Clerk, Dynamic). */
  | "identity-sync"
  /** One-call pull of a query or sheet (Dune, Google Sheets). */
  | "data-sync"
  /** Paged migration of subscribers into a list. */
  | "migrate"
  /** Iterable: a background export job, polled. */
  | "migrate-async"
  /** Nothing to run: data arrives through the SDK or a webhook. */
  | "none";

/** How a paged migration continues from one slice to the next. */
export type MigrationPaging = "rerun" | "page" | "cursor";

export interface ConnectorDef {
  /** The backend connector id (`/organization/connections/:id`). */
  id: string;
  label: string;
  connect: "paste" | "oauth";
  fields: ConnectorField[];
  action: ConnectorAction;
  /** Path segment under `/organization/integrations/` when it differs from
   *  `id` (Google Sheets is `googlesheets` but syncs at `google-sheets`). */
  route?: string;
  paging?: MigrationPaging;
  /** Where to get the credential, shown under the form. */
  where?: string;
}
