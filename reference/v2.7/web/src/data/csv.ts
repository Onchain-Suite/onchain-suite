/* Contact import parsing.
 *
 * The Audience import accepted a textarea and called itself "Import CSV". This parses what
 * people actually paste or upload: a real CSV with a header row, a headerless CSV, or a
 * bare list of one identifier per line.
 *
 * It lives in data/ rather than the modal because the rules are the interesting part —
 * which column is the wallet, what counts as valid, what silently drops — and those need
 * tests. An import that quietly discards a third of a file is worse than one that refuses. */

export interface ImportRow {
  email?: string;
  wallet?: string;
  /** Anything else on the row, keyed by header. Kept so the backend can map custom fields. */
  extra?: Record<string, string>;
}

export interface ParsedImport {
  rows: ImportRow[];
  emails: number;
  wallets: number;
  both: number;
  duplicates: number;
  /** Rows we could not read, with the reason. Surfaced in the UI — never dropped silently. */
  skipped: { line: number; raw: string; reason: string }[];
  /** Header names we recognised, for the "mapped as" line in the dialog. */
  mapped: { email?: string; wallet?: string };
}

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
const ENS_RE = /^[a-z0-9-]+\.eth$/i;

export const isEmail = (v: string) => EMAIL_RE.test(v.trim());
export const isWallet = (v: string) => WALLET_RE.test(v.trim()) || ENS_RE.test(v.trim());

const EMAIL_HEADERS = ['email', 'e-mail', 'email address', 'emailaddress', 'mail'];
const WALLET_HEADERS = ['wallet', 'address', 'wallet address', 'walletaddress', 'account', 'ens'];

/** Split one CSV line, honouring quoted fields that contain commas or escaped quotes. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i += 1; } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',' || ch === ';' || ch === '\t') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

const norm = (s: string) => s.trim().toLowerCase().replace(/^\uFEFF/, '');

export function parseContacts(text: string): ParsedImport {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const skipped: ParsedImport['skipped'] = [];
  const rows: ImportRow[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  const mapped: ParsedImport['mapped'] = {};

  if (!lines.length) return { rows, emails: 0, wallets: 0, both: 0, duplicates: 0, skipped, mapped };

  // A first line counts as a header only if it names columns and holds no actual data —
  // otherwise a pasted list starting with an address would lose its first contact.
  const first = splitCsvLine(lines[0]);
  const headerIdx = { email: -1, wallet: -1 };
  first.forEach((h, i) => {
    const n = norm(h);
    if (headerIdx.email === -1 && EMAIL_HEADERS.includes(n)) { headerIdx.email = i; mapped.email = h.trim(); }
    if (headerIdx.wallet === -1 && WALLET_HEADERS.includes(n)) { headerIdx.wallet = i; mapped.wallet = h.trim(); }
  });
  const hasHeader = (headerIdx.email !== -1 || headerIdx.wallet !== -1)
    && !first.some((c) => isEmail(c) || isWallet(c));
  const headers = hasHeader ? first.map((h) => h.trim()) : [];
  const body = hasHeader ? lines.slice(1) : lines;

  body.forEach((line, i) => {
    const lineNo = i + (hasHeader ? 2 : 1);
    const cells = splitCsvLine(line);

    let email: string | undefined;
    let wallet: string | undefined;
    // Track whether this row already has a specific reason, so a row whose email AND wallet
    // are both malformed is reported once with real detail, not three times.
    const before = skipped.length;

    if (hasHeader) {
      const e = headerIdx.email !== -1 ? cells[headerIdx.email] : undefined;
      const w = headerIdx.wallet !== -1 ? cells[headerIdx.wallet] : undefined;
      if (e && isEmail(e)) email = e.trim();
      else if (e) skipped.push({ line: lineNo, raw: e, reason: 'Not a valid email' });
      if (w && isWallet(w)) wallet = w.trim();
      else if (w) skipped.push({ line: lineNo, raw: w, reason: 'Not a wallet address or ENS name' });
    } else {
      // No header: take whichever cells look like an identifier, wherever they are.
      for (const c of cells) {
        if (!email && isEmail(c)) email = c.trim();
        else if (!wallet && isWallet(c)) wallet = c.trim();
      }
    }

    if (!email && !wallet) {
      // Only add the generic reason when nothing more specific was found for this row.
      if (skipped.length === before) {
        skipped.push({ line: lineNo, raw: line.slice(0, 60), reason: 'No email or wallet found' });
      }
      return;
    }

    // Dedupe on either identifier — the same person twice must not be messaged twice.
    const key = `${(email ?? '').toLowerCase()}|${(wallet ?? '').toLowerCase()}`;
    const soloKey = email ? `e:${email.toLowerCase()}` : `w:${wallet!.toLowerCase()}`;
    if (seen.has(key) || seen.has(soloKey)) { duplicates += 1; return; }
    seen.add(key); seen.add(soloKey);

    const extra: Record<string, string> = {};
    if (hasHeader) {
      headers.forEach((h, ci) => {
        if (ci === headerIdx.email || ci === headerIdx.wallet) return;
        if (h && cells[ci]) extra[h] = cells[ci];
      });
    }
    rows.push({ ...(email ? { email } : {}), ...(wallet ? { wallet } : {}), ...(Object.keys(extra).length ? { extra } : {}) });
  });

  return {
    rows,
    emails: rows.filter((r) => r.email && !r.wallet).length,
    wallets: rows.filter((r) => r.wallet && !r.email).length,
    both: rows.filter((r) => r.email && r.wallet).length,
    duplicates,
    skipped,
    mapped,
  };
}
