/* Query results for Intelligence. A question resolves to a shaped result — its own columns,
   rows, SQL, chart series, and the segment definition it would become if saved. This is the
   seam a real backend replaces: same shape in, same shape out. */
import type { Point } from '../screens/charts';

export type ResultKind = 'data' | 'unknown' | 'empty' | 'clarify';
export type Rule = { id: number; field: string; op: string; val: string };
export type Row = { wallet?: string; ens?: string; cells: string[] };

export interface QueryResult {
  kind: ResultKind;
  question: string;
  sql: string;
  columns: string[];
  rows: Row[];
  points: Point[];
  isTimeSeries: boolean;
  /* What this query becomes when you press "Save as segment".
   *
   * `id` is the existing segment the question is really about. Without it every "Create
   * campaign" from a result had to guess, and the guess was hardcoded to Base whales — so
   * asking about dormant wallets and acting on the answer opened a campaign aimed at
   * whales, carrying the right name over the wrong audience. */
  segment: { id: string; name: string; rules: Omit<Rule, 'id'>[]; count: number };
  /** Plain-English restatement shown above the result. */
  summary: string;
}

const HOLDERS: Row[] = [
  { wallet: '0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9F3e', ens: 'maya.eth', cells: ['4,820', '3.9%'] },
  { wallet: '0x8Cc47712bF3A0d2eE291B7A5C41f9E88Dd0121aB', cells: ['3,140', '2.5%'] },
  { wallet: '0xF31d99C02aE84b7cD1204E5F6a7B8C9D0E1F77c0', ens: 'leo.eth', cells: ['2,610', '2.1%'] },
  { wallet: '0x44Ab0912CdEf34567890aBcDeF1234567890BeeF', cells: ['1,980', '1.6%'] },
  { wallet: '0x9E0fD34567812345aBcD6789Ef0123456789Cafe', ens: 'degen.eth', cells: ['1,540', '1.2%'] },
];
const ENGAGED: Row[] = [
  { wallet: '0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9F3e', ens: 'maya.eth', cells: ['4', '0', 'Jul 22'] },
  { wallet: '0x50E81f4B4d1cC2aA71bD9e0Ff3A2C8b7D6e5F401', cells: ['3', '0', 'Jul 21'] },
  { wallet: '0xDD0217aB9cF3e5D4b6A8C0132eF45678901aB2Cd', ens: 'dami.eth', cells: ['3', '0', 'Jul 21'] },
  { wallet: '0xA27dc913E45B6f7089aC1dE2f3B45678C90D1e2F', cells: ['2', '0', 'Jul 19'] },
];

const CHAIN_SPREAD: Point[] = [
  { label: 'Base', value: 5820 }, { label: 'Ethereum', value: 4110 },
  { label: 'Arbitrum', value: 2640 }, { label: 'Optimism', value: 1780 }, { label: 'Polygon', value: 1010 },
];
const SUPPLY_SHARE: Point[] = [
  { label: 'maya.eth', value: 4820 }, { label: '0x8Cc4…21aB', value: 3140 },
  { label: 'leo.eth', value: 2610 }, { label: '0x44Ab…BeeF', value: 1980 }, { label: 'degen.eth', value: 1540 },
];
const WEEKLY: Point[] = [
  { label: 'W1', value: 620 }, { label: 'W2', value: 810 }, { label: 'W3', value: 760 },
  { label: 'W4', value: 1180 }, { label: 'W5', value: 1440 }, { label: 'W6', value: 1310 }, { label: 'W7', value: 1890 },
];

function classify(q: string): ResultKind {
  const s = q.toLowerCase();
  if (/(price|worth|predict|will |should i|forecast|next week|moon|weather|news)/.test(s)) return 'unknown';
  if (/(solana|bitcoin|\bdoge\b|cardano|tiktok)/.test(s)) return 'empty';
  if (s.trim().split(/\s+/).length <= 2 || /^(show me wallets|top users|best wallets|good ones)\b/.test(s)) return 'clarify';
  return 'data';
}

/** Which saved segment a question is about. Keyword-matched here so the answer, the
 *  segment draft and any campaign built from it all point at the same people. */
function pickSegmentId(s: string): string {
  if (/dormant|quiet|inactive|lapsed|churn|went away|stopped/.test(s)) return 'dormant';
  if (/liquidity|\blps?\b|pool/.test(s)) return 'lps';
  if (/vote|governance|proposal|quorum/.test(s)) return 'voters';
  if (/bought|buyer|purchase|minted|mint\b/.test(s)) return 's2buyers';
  if (/\bnew\b|recent|first seen|joined|signed up/.test(s)) return 'newholders';
  if (/whale|top holder|largest|balance|richest/.test(s)) return 'whales';
  return 'active';
}

/** Resolve a plain-English question into a shaped result. */
export function runQuery(question: string): QueryResult {
  const kind = classify(question);
  const s = question.toLowerCase();
  const base = { kind, question, isTimeSeries: false };
  const segId = pickSegmentId(s);

  if (kind !== 'data') {
    return { ...base, sql: '', columns: [], rows: [], points: [], summary: '', segment: { id: 'active', name: '', rules: [], count: 0 } };
  }

  // Engagement questions — opened / clicked / campaign behaviour.
  if (/(open|click|email|push|campaign|engage)/.test(s)) {
    return {
      ...base,
      summary: 'the wallets that engaged, and how that engagement trends week over week',
      sql: `SELECT wallet, COUNT(*) FILTER (WHERE event = 'open')  AS opens,\n       COUNT(*) FILTER (WHERE event = 'click') AS clicks,\n       MAX(occurred_at)::date AS last_seen\nFROM message_events\nWHERE occurred_at > now() - interval '30 days'\nGROUP BY wallet\nHAVING COUNT(*) FILTER (WHERE event = 'click') = 0\nORDER BY opens DESC\nLIMIT 50;`,
      columns: ['Wallet', 'Opens', 'Clicks', 'Last seen'],
      rows: ENGAGED,
      points: WEEKLY,
      isTimeSeries: true,
      segment: {
        id: segId,
        name: question.length > 40 ? 'Opened, never clicked' : question,
        rules: [{ field: 'Email opened', op: 'is within', val: '30 days' }, { field: 'Email clicked', op: 'equals', val: '0' }],
        count: 1846,
      },
    };
  }

  // Balance / chain-spread questions.
  if (/(chain|across|spread|balance)/.test(s)) {
    return {
      ...base,
      summary: 'how wallet balances spread across the chains you index',
      sql: `SELECT chain, SUM(balance) AS total\nFROM wallet_balances\nWHERE token = '$VAULT'\nGROUP BY chain\nORDER BY total DESC;`,
      columns: ['Wallet', '$VAULT', 'Supply'],
      rows: HOLDERS,
      points: CHAIN_SPREAD,
      segment: {
        id: segId,
        name: question.length > 40 ? 'Multi-chain holders' : question,
        rules: [{ field: 'Wallet balance', op: 'is greater than', val: '0' }, { field: 'Chain activity', op: 'is within', val: '30 days' }],
        count: 15360,
      },
    };
  }

  // Default: top holders by token.
  return {
    ...base,
    summary: 'the top matching wallets and how they spread across chains',
    sql: `SELECT wallet, SUM(balance) AS vault\nFROM holders\nWHERE token = '$VAULT'\nGROUP BY wallet\nORDER BY vault DESC\nLIMIT 50;`,
    columns: ['Wallet', '$VAULT', 'Supply'],
    rows: HOLDERS,
    points: SUPPLY_SHARE,
    segment: {
      id: segId,
      name: question.length > 40 ? 'Top $VAULT holders' : question,
      rules: [{ field: 'Token held', op: 'equals', val: '$VAULT' }, { field: 'Wallet balance', op: 'is greater than', val: '1,000' }],
      count: 1204,
    },
  };
}
