/**
 * CSV for the consent import, parsed in the browser so the file is sent as
 * small JSON chunks (the API takes 500 rows per request). Pure.
 */

/** RFC 4180: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export type ConsentColumn =
  "walletAddress" | "phone" | "consentedAt" | "source" | "ipAddress";

/** Header spellings we recognise, compared lowercase with spaces/underscores removed. */
const ALIASES: Record<ConsentColumn, string[]> = {
  walletAddress: ["walletaddress", "wallet", "address"],
  phone: ["phone", "phonenumber", "number", "mobile", "msisdn"],
  consentedAt: [
    "consentedat",
    "consentdate",
    "optedinat",
    "optinat",
    "consentat",
    "date",
  ],
  source: ["source", "consentsource"],
  ipAddress: ["ipaddress", "ip"],
};

export const REQUIRED_COLUMNS: ConsentColumn[] = [
  "walletAddress",
  "phone",
  "consentedAt",
];

/** Which column index holds each field, from the header row. */
export function mapColumns(
  header: string[]
): Partial<Record<ConsentColumn, number>> {
  const out: Partial<Record<ConsentColumn, number>> = {};
  header.forEach((h, i) => {
    const key = h.toLowerCase().replace(/[\s_-]/g, "");
    for (const col of Object.keys(ALIASES) as ConsentColumn[]) {
      if (out[col] === undefined && ALIASES[col].includes(key)) out[col] = i;
    }
  });
  return out;
}

export type ConsentRow = Partial<Record<ConsentColumn, string>>;

export function toRows(
  body: string[][],
  columns: Partial<Record<ConsentColumn, number>>
): ConsentRow[] {
  return body.map((cells) => {
    const row: ConsentRow = {};
    for (const [col, idx] of Object.entries(columns) as Array<
      [ConsentColumn, number]
    >) {
      const v = (cells[idx] ?? "").trim();
      if (v) row[col] = v;
    }
    return row;
  });
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}
