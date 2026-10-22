/** Minimal CSV parsing for locally simulated audience imports. */

export const parseCsvRow = (line: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = i + 1 < line.length ? line[i + 1] : "";
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
};

export const parseCsv = (text: string) => {
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] as string[][] };
  const headers = parseCsvRow(lines[0]).map((h) =>
    h.replace(/^"|"$/g, "").trim()
  );
  const rows = lines.slice(1).map((line) => parseCsvRow(line));
  return { headers, rows };
};

export const toTags = (raw: unknown): string[] | undefined => {
  if (Array.isArray(raw)) {
    const out = raw
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter((v) => v.length > 0);
    return out.length > 0 ? out : undefined;
  }
  if (typeof raw !== "string") return undefined;
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts : undefined;
};
