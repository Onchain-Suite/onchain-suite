// Backend contract for org channel connections.
// Mirrors onchain-backend connections ConnectionSummaryDto
// (GET /organization/connections). Types only.

/** A connected channel/source for the org (never carries secrets). */
export interface ConnectionSummary {
  /** The connector key: telegram | discord | whatsapp | x | farcaster | ... */
  connector: string;
  /** "channel" or "source". */
  kind: string;
  /** Non-secret identifiers safe to render (e.g. { label, botUsername }). */
  config: Record<string, unknown>;
  /** Connected AND working - a connection present but unverified is not usable. */
  verified: boolean;
  verifiedAt: string | null;
  lastError: string | null;
  updatedAt: string;
}
