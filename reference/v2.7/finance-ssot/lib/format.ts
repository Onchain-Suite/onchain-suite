// Formatters. Numbers on a page always go through one of these. Missing values read "n/a".
export const num = (v: unknown): number => (typeof v === 'number' ? v : typeof v === 'string' ? Number(v) || 0 : 0);
export const NA = 'n/a';

export function usd(v: unknown, digits = 1): string {
  if (v === null || v === undefined || v === '') return NA;
  const n = num(v); const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(digits)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
export function pct(v: unknown, digits = 2): string {
  if (v === null || v === undefined || v === '') return NA;
  return `${num(v).toFixed(digits)}%`;
}
/** A unit price: never compact, two decimals, four below $10 (NAV-style tokens). Oracle prices, NAV, share prices. */
export function price(v: unknown, digits = 2): string {
  const n = num(v); if (!Number.isFinite(n) || v === null || v === undefined) return NA;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: n !== 0 && Math.abs(n) < 10 ? 4 : digits }).format(n);
}
export function count(v: unknown, digits = 0): string {
  if (v === null || v === undefined || v === '') return NA;
  const n = num(v); const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(digits);
}
export function day(v: unknown): string {
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v ? String(v) : NA;
}
/** "12 Sep" style axis label from an ISO day. */
export function shortDay(v: string): string {
  const d = new Date(v + 'T00:00:00Z');
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
/** Signed change with a sign, e.g. "+4.2%". */
export function delta(v: unknown, digits = 1): string {
  if (v === null || v === undefined || v === '') return NA;
  const n = num(v); return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`;
}
export const address = (a: string, n = 4) => (a && a.length > 2 * n + 2 ? `${a.slice(0, n + 2)}…${a.slice(-n)}` : a);

export type Unit = 'usd' | 'pct' | 'count' | 'price';
export const byUnit: Record<Unit, (v: unknown) => string> = { usd: (v) => usd(v), pct: (v) => pct(v, 1), count: (v) => count(v), price: (v) => price(v) };
