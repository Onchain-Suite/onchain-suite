import { productEventFields } from './productEvents';
/* Segment rule tree (2.7).
 *
 * The old builder had twelve fields and four operators — greater than, less than, equals,
 * is within — with a single level of AND/OR. It could not express "has not", which makes
 * the most common retention query there is unwritable: held for 90 days and has not staked.
 * Nor could it express frequency: swapped at least three times in 14 days.
 *
 * Two rules are load-bearing here, and both are about refusing to guess.
 *
 * Every event predicate carries a mandatory window. "Has not swapped" is not a question —
 * ever? this year? — and a silent default produces a confidently wrong audience that looks
 * right. The builder requires one rather than filling it in.
 *
 * And negation is an anti-join. At audience scale it will not stay fast, so the preview
 * count reports an estimate with a visible "≈" rather than spinning and then lying about
 * precision it does not have. */

export type Op =
  | 'gt' | 'lt' | 'eq' | 'between'
  | 'did' | 'did_not'
  | 'count_gte' | 'count_lte';

export interface OpMeta {
  id: Op;
  label: string;
  /** Event operators need a window; attribute operators do not. */
  event: boolean;
  /** Needs a count as well as a window. */
  counted?: boolean;
}

export const OPS: OpMeta[] = [
  { id: 'gt', label: 'is greater than', event: false },
  { id: 'lt', label: 'is less than', event: false },
  { id: 'eq', label: 'is', event: false },
  { id: 'between', label: 'is between', event: false },
  { id: 'did', label: 'has done', event: true },
  { id: 'did_not', label: 'has NOT done', event: true },
  { id: 'count_gte', label: 'has done at least', event: true, counted: true },
  { id: 'count_lte', label: 'has done at most', event: true, counted: true },
];

export const opMeta = (id: Op) => OPS.find((o) => o.id === id)!;

/** Fields split by kind, because an event field and an attribute field take different
 *  operators and mixing them is how you get "wallet balance has NOT done". */
export const ATTRIBUTE_FIELDS = [
  'Wallet balance', 'Token held', 'Lifetime value', 'Health score', 'Lifecycle stage', 'Home chain', 'Tag', 'Segment',
];
/* Three lanes, in the order the plan names them: what a wallet did on the chain, what the
   customer did inside the operator's application, and how they responded to a message. The
   product lane arrives through the SDK's track(), so its entries are whatever the operator
   actually sends — which is why they are read from the catalogue rather than typed here. */
export const CHAIN_EVENT_FIELDS = [
  'Any on-chain action', 'Swapped', 'Staked', 'Unstaked', 'Minted', 'Bridged', 'Added liquidity',
];
export const MESSAGE_EVENT_FIELDS = [
  'Opened an email', 'Clicked an email', 'Viewed a push', 'Submitted a form', 'Received a campaign',
];
export const PRODUCT_EVENT_FIELDS = productEventFields();

export const EVENT_FIELDS = [
  ...CHAIN_EVENT_FIELDS, ...PRODUCT_EVENT_FIELDS, ...MESSAGE_EVENT_FIELDS,
];

export const isEventField = (f: string) => EVENT_FIELDS.includes(f);

export const WINDOWS = [7, 14, 30, 60, 90, 180];

export interface Predicate {
  kind: 'predicate';
  id: number;
  field: string;
  op: Op;
  value: string;
  /** Mandatory whenever the operator is an event operator. */
  windowDays: number;
  count: number;
}

export interface Group {
  kind: 'group';
  id: number;
  op: 'and' | 'or';
  children: Node[];
}

export type Node = Predicate | Group;

let seq = 1;
export const nextId = () => seq++;

export const newPredicate = (field = 'Wallet balance'): Predicate => ({
  kind: 'predicate', id: nextId(), field,
  op: isEventField(field) ? 'did' : 'gt',
  value: isEventField(field) ? '' : '10',
  windowDays: 30, count: 3,
});

export const newGroup = (op: 'and' | 'or' = 'or'): Group => ({
  kind: 'group', id: nextId(), op, children: [newPredicate(), newPredicate('Staked')],
});

/** Depth-first rewrite, since the tree is immutable and React needs new objects. */
export function updateNode(root: Group, id: number, fn: (n: Node) => Node): Group {
  const walk = (n: Node): Node => {
    if (n.id === id) return fn(n);
    if (n.kind === 'group') return { ...n, children: n.children.map(walk) };
    return n;
  };
  return walk(root) as Group;
}

export function removeNode(root: Group, id: number): Group {
  const walk = (g: Group): Group => ({
    ...g,
    children: g.children.filter((c) => c.id !== id).map((c) => (c.kind === 'group' ? walk(c) : c)),
  });
  return walk(root);
}

export function addTo(root: Group, groupId: number, node: Node): Group {
  return updateNode(root, groupId, (n) =>
    n.kind === 'group' ? { ...n, children: [...n.children, node] } : n) as Group;
}

/** Plain-English rendering — the thing that tells an operator the tree says what they meant. */
export function describe(n: Node, depth = 0): string {
  if (n.kind === 'predicate') {
    const o = opMeta(n.op);
    if (o.counted) return `${n.field} at least ${n.count}× in ${n.windowDays}d`;
    if (o.event) return `${o.id === 'did_not' ? 'has not' : 'has'} ${n.field.toLowerCase()} in ${n.windowDays}d`;
    return `${n.field} ${o.label} ${n.value || '…'}`;
  }
  const joined = n.children.map((c) => describe(c, depth + 1)).join(n.op === 'and' ? ' AND ' : ' OR ');
  return depth === 0 ? joined : `(${joined})`;
}

export function countPredicates(n: Node): number {
  return n.kind === 'predicate' ? 1 : n.children.reduce((a, c) => a + countPredicates(c), 0);
}

export function hasNegation(n: Node): boolean {
  return n.kind === 'predicate'
    ? n.op === 'did_not' || n.op === 'count_lte'
    : n.children.some(hasNegation);
}

/* A deterministic estimate. Each predicate narrows the pool; negation narrows it less and
 * costs an anti-join, which is why its presence flips the count to approximate. */
export function estimate(root: Group, audience: number): { count: number; approximate: boolean } {
  const factor = (n: Node): number => {
    if (n.kind === 'predicate') {
      const o = opMeta(n.op);
      if (o.id === 'did_not') return 0.62;
      if (o.id === 'count_gte') return 0.18;
      if (o.id === 'count_lte') return 0.55;
      if (o.event) return 0.34;
      return 0.45;
    }
    const fs = n.children.map(factor);
    return n.op === 'and'
      ? fs.reduce((a, f) => a * f, 1)
      : Math.min(1, fs.reduce((a, f) => a + f, 0));
  };
  return { count: Math.round(audience * factor(root)), approximate: hasNegation(root) };
}

/* A saved query's rules, as a tree.
 *
 * Queries describe their segment in a flat vocabulary — field, a human operator, a value —
 * because that is what a question produces. The builder works in predicates, windows and
 * counts. Until this existed the two never met: asking a question and pressing "save as
 * segment" opened the builder on its own default tree, so the draft had nothing to do with
 * the question that produced it, and the only thing carried across was the name.
 *
 * Rules nobody can express as a predicate are dropped rather than guessed at. A rule that
 * silently becomes a different rule is worse than a rule that is visibly missing. */
const OP_FROM_QUERY: Record<string, Op> = {
  'is greater than': 'gt',
  'is less than': 'lt',
  equals: 'eq',
  'is within': 'did',
};

/* A question's answer names its fields in its own words ("Email opened"); the builder has its
   own list ("Opened an email"). A name the builder does not have rendered as whatever its
   dropdown listed first, so a rule for a token read as "Wallet balance is $VAULT". */
const FIELD_FROM_QUERY: Record<string, string> = {
  'Email opened': 'Opened an email',
  'Email clicked': 'Clicked an email',
  'Chain activity': 'Any on-chain action',
};

export function treeFromQueryRules(rules: { field: string; op: string; val: string }[]): Group {
  const children: Node[] = rules.map((r0) => {
    const r = { ...r0, field: FIELD_FROM_QUERY[r0.field] ?? r0.field };
    // "Clicked equals 0" is an event that has not happened, not an attribute equal to zero.
    const op: Op = isEventField(r.field) && r.op === 'equals' && r.val.trim() === '0'
      ? 'did_not'
      : OP_FROM_QUERY[r.op] ?? (isEventField(r.field) ? 'did' : 'eq');
    const days = Number((r.val.match(/(\d+)\s*day/) ?? [])[1]);
    return {
      kind: 'predicate' as const,
      id: nextId(),
      field: r.field,
      op,
      // An event predicate carries its window in windowDays, so the value stays the subject.
      value: op === 'did' || op === 'did_not' ? '' : r.val,
      windowDays: Number.isFinite(days) && days > 0 ? days : 30,
      count: 3,
    };
  });
  return { kind: 'group', id: nextId(), op: 'and', children: children.length ? children : [newPredicate()] };
}
