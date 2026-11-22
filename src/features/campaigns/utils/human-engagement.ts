import type {
  HumanEngagement,
  HumanOpenCounts,
  HumanOpens,
} from "../contracts/human-engagement";

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const counts = (raw: unknown): HumanOpenCounts | null => {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const low = num(o.humanEstimateLow);
  const high = num(o.humanEstimateHigh);
  const apple = num(o.apple);
  const machine = num(o.machine);
  const rawOpens = num(o.raw);
  if (
    low === null ||
    high === null ||
    apple === null ||
    machine === null ||
    rawOpens === null
  )
    return null;
  return {
    humanEstimateLow: low,
    humanEstimateHigh: high,
    apple,
    machine,
    raw: rawOpens,
  };
};

/** The human-first block, normalised. Each part is null when this backend (or this read) left it out. */
export interface HumanStats {
  humanClicks: number | null;
  humanClickRate: number | null;
  opens: HumanOpens | null;
}

/**
 * Read the human-first fields off an email funnel or a message node. Never
 * throws; an older payload gives all nulls, and the caller falls back to the
 * raw opens and clicks it always showed.
 */
export function readHumanStats(source: unknown): HumanStats {
  const o =
    source && typeof source === "object"
      ? (source as HumanEngagement & Record<string, unknown>)
      : {};
  const opensRaw = o.opens;
  const c = counts(opensRaw);
  const rates =
    opensRaw && typeof opensRaw === "object"
      ? counts((opensRaw as unknown as Record<string, unknown>).rates)
      : null;
  return {
    humanClicks: num(o.humanClicks),
    humanClickRate: num(o.humanClickRate),
    opens: c && rates ? { ...c, rates } : null,
  };
}

export const hasHumanStats = (s: HumanStats): boolean =>
  s.humanClicks !== null || s.humanClickRate !== null || s.opens !== null;

const pct = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

/** "13.7-38.9% (estimate)"; a single value when the ends agree. */
export function formatOpenRange(opens: HumanOpens): string {
  const lo = pct(opens.rates.humanEstimateLow);
  const hi = pct(opens.rates.humanEstimateHigh);
  return lo === hi ? `${lo}% (estimate)` : `${lo}–${hi}% (estimate)`;
}

export const formatRate = (v: number | null): string =>
  v === null ? "-" : `${pct(v)}%`;

export const OPEN_RANGE_EXPLANATION =
  "Apple Mail Privacy Protection loads every email for Apple Mail users, read or not, and security scanners and bots open mail too. So we show a range: the low end counts only opens we can tell came from people; the high end adds Apple Mail opens that might be real. The true number is in between.";
