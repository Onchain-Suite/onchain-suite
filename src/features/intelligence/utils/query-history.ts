import { isJsonObject } from "@/lib/utils";

/** One normalised row from `GET /intelligence/query/history`, ready to render or
 *  count. `isAgent` decides replay: an agent run reloads the chat prompt, an SQL
 *  run reopens the saved query. */
export interface QueryHistoryItem {
  qid: string;
  q: string;
  isAgent: boolean;
  status: string;
  createdAt: string;
}

/**
 * Normalise the raw history payload into displayable rows: pull the query id and
 * text from whichever keys the backend used, flag agent vs. SQL runs, drop rows
 * with no id or text, and cap at 12. Shared by the history panel (render) and the
 * tab-bar History toggle (count), so both agree on exactly what counts.
 */
export const toQueryHistoryItems = (raw: unknown[]): QueryHistoryItem[] =>
  (raw ?? [])
    .map((h) => (isJsonObject(h) ? (h as Record<string, unknown>) : {}))
    .map((item) => {
      const provider =
        typeof item.provider === "string" ? item.provider.toLowerCase() : "";
      return {
        qid:
          typeof item.queryId === "string"
            ? item.queryId
            : typeof item.id === "string"
              ? item.id
              : "",
        q:
          typeof item.query === "string" && item.query.length > 0
            ? item.query
            : typeof item.name === "string" && item.name.length > 0
              ? item.name
              : typeof item.summary === "string"
                ? item.summary
                : "",
        // Backend `provider` is now "alchemy"/"agent"; older rows still read
        // "goldrush"/"mcp". Match all so replay routes correctly.
        isAgent:
          provider.includes("agent") ||
          provider.includes("alchemy") ||
          provider.includes("goldrush") ||
          provider.includes("mcp"),
        status: typeof item.status === "string" ? item.status : "",
        createdAt:
          typeof item.createdAt === "string"
            ? item.createdAt
            : typeof item.timestamp === "string"
              ? item.timestamp
              : "",
      };
    })
    .filter((x) => x.qid && x.q.length > 0)
    .slice(0, 12);
