const FORMATTED_SUFFIX = "_formatted";

/**
 * The backend injects human-readable `<key>_formatted` siblings next to raw
 * base-unit Web3 amounts on every Alchemy on-chain data path (docs/backend.md
 * 2026-07-28, `normalizeWeb3Payload`) - e.g. USDC `balance: "2500000"` →
 * `balance_formatted: "2.5"`. Render the formatted value when present.
 */
export const preferFormattedCell = (
  row: Record<string, unknown>,
  column: string
): unknown => {
  const formatted = row[`${column}${FORMATTED_SUFFIX}`];
  if (typeof formatted === "string" && formatted.trim().length > 0) {
    return formatted;
  }
  if (typeof formatted === "number" && Number.isFinite(formatted)) {
    return formatted;
  }
  return row[column];
};

/**
 * Hide `<key>_formatted` columns whose base column is also present - the base
 * column already renders the formatted value via {@link preferFormattedCell},
 * so showing both duplicates the data.
 */
export const dropFormattedSiblingColumns = (columns: string[]): string[] => {
  const present = new Set(columns);
  return columns.filter(
    (column) =>
      !(
        column.endsWith(FORMATTED_SUFFIX) &&
        present.has(column.slice(0, -FORMATTED_SUFFIX.length))
      )
  );
};
