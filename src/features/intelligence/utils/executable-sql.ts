/**
 * Normalize the editor SQL into what the backend accepts:
 *  - strip leading comments/whitespace so it begins with `select`/`with`
 *    (a leading comment trips "Only SELECT queries are allowed"), and
 *  - drop statement-ending semicolons (the backend runs a single read-only
 *    statement and rejects any semicolons).
 * The editor keeps the user's text as-is; this only affects what we send.
 */
export const toExecutableSql = (sql: string): string => {
  let s = sql;
  // Peel leading whitespace / line comments / block comments until the next
  // token is real SQL (bounded loop guards against pathological input).
  for (let i = 0; i < 1000; i += 1) {
    const before = s;
    s = s.replace(/^\s+/, "");
    if (s.startsWith("--")) {
      const nl = s.indexOf("\n");
      s = nl === -1 ? "" : s.slice(nl + 1);
    } else if (s.startsWith("/*")) {
      const end = s.indexOf("*/");
      s = end === -1 ? "" : s.slice(end + 2);
    }
    if (s === before) break;
  }
  // Remove semicolons at the end of a line or the query (keeps any inside
  // string literals on a line with more content untouched).
  s = s.replace(/;[ \t]*(?=\r?\n|$)/g, "");
  return s.trim();
};
