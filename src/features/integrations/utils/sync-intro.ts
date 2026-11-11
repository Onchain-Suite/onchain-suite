import type { ConnectorDef } from "../types/connectors";

/**
 * What a source's sync does, said before it starts. Three kinds of source read
 * differently and the sentence has to be true of the one on screen:
 *
 *  - a table (a Dune query, a sheet) is re-read whole each time;
 *  - a user directory (Privy, Clerk, Dynamic) is read whole once, then kept
 *    current by the server every 6 hours; one with no schedule (Formo, a
 *    subgraph) is a pull each time it is asked for;
 *  - a chain (the customer's RPC endpoint) is read from the contract's first
 *    block once, then only the new blocks every 6 hours.
 */
export function syncIntro(def: ConnectorDef): string {
  if (def.action === "data-sync") {
    return def.scheduled
      ? "The first sync reads the contract's whole history, which can take a while on an old or busy contract. After that, new blocks are read every 6 hours."
      : "Pull the rows in as contacts. Rows already here are matched, not duplicated.";
  }
  return def.scheduled
    ? `New ${def.label} users sync every 6 hours. Sync now to pull everyone in straight away.`
    : `Pull everyone ${def.label} holds in as contacts. People already here are matched, not duplicated.`;
}
