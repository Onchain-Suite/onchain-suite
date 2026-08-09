/**
 * Module-level formatter instances.
 *
 * `new Intl.DateTimeFormat(...)` is expensive relative to `.format()`, and
 * `toLocaleDateString` constructs one per call. Hoisting them means a listing of
 * N posts builds one formatter, not N (CLAUDE.md §4).
 */

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/**
 * UTC is pinned deliberately: these pages are prerendered on the server and
 * served from cache, so formatting in the build machine's local zone would show
 * every reader the same, possibly wrong, date.
 */
export function formatPostDate(value: string | null): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : dateFormatter.format(parsed);
}

/** Machine-readable date for <time dateTime> and structured data. */
export function toIsoDate(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
