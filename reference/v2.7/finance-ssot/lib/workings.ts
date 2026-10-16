// The monthly working, and the export of it.
//
// The document reports five financial years. That is the answer, not the working, and a reader who
// wants to check the answer cannot get behind it. This turns the projection back into the schedules
// it is actually made of: customers in and out, what they subscribe for, what they consume beyond
// their allowance, what we spend, and how all of that lands in profit, cash and the balance sheet.
//
// An external reviewer put it plainly: they can check arithmetic from the PDF, but checking formula
// behaviour needs the monthly calculation export. That is what toCsv produces.
import { derive, SCENARIOS } from '@/lib/model';
import type { State } from '@/lib/store';

export type MonthRow = Record<string, number | boolean | Record<string, number>>;

/** Every month of a projection, flattened so each column is one number. */
export function flatten(rows: MonthRow[]): Record<string, number>[] {
  return rows.map((r) => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === 'number') out[k] = v;
      else if (typeof v === 'boolean') out[k] = v ? 1 : 0;
      else if (v && typeof v === 'object') for (const [k2, v2] of Object.entries(v)) out[`${k}.${k2}`] = v2;
    }
    return out;
  });
}

/** Calendar label for a model month, so a row can be tied to a real date. */
export function monthLabel(s: State, m: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const i = s.fin.startMonth - 1 + (m - 1);
  return `${names[i % 12]} ${s.fin.startYear + Math.floor(i / 12)}`;
}

/** The full monthly calculation, as CSV. Every field the projection carries, one row per month. */
export function toCsv(s: State): string {
  const d = derive(structuredClone(s));
  const flat = flatten(d.fin.rows as unknown as MonthRow[]);
  const cols = Array.from(new Set(flat.flatMap((r) => Object.keys(r)))).sort();
  const head = ['month', ...cols];
  const lines = [head.join(',')];
  flat.forEach((r, i) => {
    lines.push([monthLabel(s, i + 1), ...cols.map((c) => (r[c] === undefined ? '' : String(r[c])))].join(','));
  });
  return lines.join('\n');
}

/** The same projection under a scenario, for comparing one case against another month by month. */
export function runScenario(s: State, name: keyof typeof SCENARIOS) {
  const sc = SCENARIOS[name];
  const t = structuredClone(s);
  t.mix = { ...sc.mix };
  t.chainPassesPerMonth = sc.chainPassesPerMonth;
  t.fin.churn = sc.churn;
  t.fin.newPerMonth = sc.newPerMonth;
  t.fin.newGrowth = sc.newGrowth;
  t.planChurn = sc.churn;
  return derive(t);
}
