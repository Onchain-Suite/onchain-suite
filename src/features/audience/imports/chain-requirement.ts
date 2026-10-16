/**
 * When the import wizard must ask for a chain.
 *
 * The chain picker answers "which chain should we enrich these wallets on".
 * For a list of email-only contacts that question has no meaning, and requiring
 * an answer left those users on a permanently disabled Import button — the
 * commonest import we have, blocked by a field about a column their file does
 * not contain.
 *
 * The backend never required it. `defaultChain` is optional on the import
 * options, and the row writer sets `walletChain` only `if (payload.walletAddress)`,
 * so email-only rows already store null. This was the UI being stricter than
 * the thing it talks to.
 *
 * Lives here rather than inline in import-export.tsx so the rule can be tested
 * without mounting a 2.6k-line wizard, and so the test binds to the shipped
 * expression instead of a copy of it.
 */
export interface ChainRequirementInput {
  /** Resolved upload format; undefined before a file is chosen. */
  format: "csv" | "json" | undefined;
  /** The `mappedTo` value of each detected column ("" when skipped). */
  mappings: string[];
}

export function isChainRequired({
  format,
  mappings,
}: ChainRequirementInput): boolean {
  // JSON has no column mapping to inspect, so we cannot tell whether wallets
  // are present. Keep asking: silently defaulting the chain on a wallet import
  // is the worse error — it enriches on the wrong chain, which is how every
  // wallet ended up showing an ETH logo.
  if (format === "json") return true;

  const hasWalletColumn = mappings.includes("wallet");
  // A per-row Chain column answers the question for every row and wins over
  // the global picker, so demanding a default on top is redundant — and the
  // redundant one is the blocking one.
  const hasPerRowChainColumn = mappings.includes("chain");
  return hasWalletColumn && !hasPerRowChainColumn;
}
