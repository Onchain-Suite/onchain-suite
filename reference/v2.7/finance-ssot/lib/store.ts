// The document's state, held outside React.
//
// Every figure on every page comes from one object: the inputs S, and D = derive(S),
// everything computed from them. That is the contract the single-file version had and
// the reason two people reading this see the same numbers.
//
// It is an external store rather than a context provider because every place a provider
// could mount - app/layout.tsx, app/(app)/layout.tsx, components/Providers.tsx - is a file
// the kit owns and `datum-ui sync` copies forward. A store subscribed to with
// useSyncExternalStore needs no wrapper, so the kit's files stay exactly as the kit wrote
// them and any component can read the model.
import { DEFAULTS, SCENARIOS, BASELINE, STORE_KEY, derive, fmt, getPath, setPath } from '@/lib/model';

export type Ccy = 'usd' | 'gbp' | 'both';
export type ScenarioName = 'bear' | 'base' | 'bull';

type Listener = () => void;

/** Inputs. Shape comes from DEFAULTS in lib/model.js, which is the authority. */
export type State = typeof DEFAULTS;
/** Everything derived from the inputs. */
export type Derived = ReturnType<typeof derive>;

type Snapshot = {
  s: State;
  d: Derived;
  ccy: Ccy;
  scenario: ScenarioName | 'custom';
  dirty: boolean;
};

const listeners = new Set<Listener>();
let snapshot: Snapshot = build(structuredClone(DEFAULTS), 'base');

/** derive() mutates what it is given (it writes plan prices back onto the inputs), so it
 *  is always handed a clone and never the object the UI holds. */
function build(s: State, scenario: ScenarioName | 'custom'): Snapshot {
  const d = derive(structuredClone(s)) as Derived;
  return { s, d, ccy: (s as { ccy?: Ccy }).ccy ?? 'both', scenario, dirty: !isBaseline(s) };
}

function isBaseline(s: State) {
  return JSON.stringify(stripDisplay(s)) === JSON.stringify(stripDisplay(DEFAULTS as State));
}

/** Currency is a display preference, not an input, so it does not make the document dirty. */
function stripDisplay(s: State) {
  const c = structuredClone(s) as Record<string, unknown>;
  delete c.ccy;
  return c;
}

function emit() {
  for (const l of listeners) l();
}

function commit(s: State, scenario: ScenarioName | 'custom') {
  snapshot = build(s, scenario);
  persist(s);
  emit();
}

// ---------------------------------------------------------------------------
// Persistence. The saved copy carries the baseline it was written against; a stale
// one is dropped rather than merged, because a scenario saved against different
// defaults is not the same document.
// ---------------------------------------------------------------------------
/* A fingerprint of the inputs: every key AND every value, canonically ordered.
 *
 * This started as a fingerprint of the SHAPE only, and that was not enough. On 3 Oct a
 * CEO stipend was added to fin.hires, seed flags were added to fin.customers and the
 * founder pool changed value - and the shape fingerprint did not move, because it
 * returned "path[]" for an array without descending into it and ignored values entirely.
 * Every browser holding a saved scenario kept hydrating it, so none of those changes
 * reached a reader. BASELINE had not been bumped either, so both guards missed it at once.
 *
 * Hashing the whole canonical value closes that: ANY change to DEFAULTS - a new hire, a
 * new flag, a changed number - produces a different fingerprint and drops saved
 * scenarios. A reader loses their own edits when the baseline moves, which is the
 * documented intent: a scenario saved against different defaults is not this document. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v as Record<string, unknown>).sort()
      .map((k) => k + ':' + canonical((v as Record<string, unknown>)[k])).join(',') + '}';
  }
  return typeof v === 'function' ? 'fn' : JSON.stringify(v) ?? 'null';
}

function fingerprint(v: unknown): string {
  const text = canonical(v);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const SHAPE = fingerprint(DEFAULTS);

function persist(s: State) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ baseline: BASELINE, shape: SHAPE, state: s }));
  } catch {
    // Private windows and blocked storage both throw. The document still works.
  }
}

export function hydrate() {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { baseline?: string; shape?: string; state?: State };
    // Either test failing means the saved scenario is not this document.
    if (saved.baseline !== BASELINE || saved.shape !== SHAPE || !saved.state) return;
    snapshot = build(saved.state, 'custom');
    emit();
  } catch {
    // A corrupt or unreadable copy is not worth failing over.
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export const subscribe = (l: Listener) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const getSnapshot = () => snapshot;
/** The server renders the agreed baseline, never a reader's saved scenario. */
export const getServerSnapshot = () => snapshot;

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------
/** Set one input by its dotted path, the same addressing the single-file version used. */
export function setInput(path: string, value: unknown) {
  const s = structuredClone(snapshot.s);
  setPath(s, path, value);
  commit(s, 'custom');
}

export function readInput(path: string) {
  return getPath(snapshot.s, path);
}

export function setCcy(ccy: Ccy) {
  const s = structuredClone(snapshot.s);
  (s as { ccy?: Ccy }).ccy = ccy;
  commit(s, snapshot.scenario);
}

/** Applies every lever the scenario defines, and nothing it does not. The single-file
 *  version had two copies of this and they drifted, which zeroed the whole document. */
export function applyScenario(name: ScenarioName) {
  const sc = SCENARIOS[name];
  const s = structuredClone(snapshot.s);
  s.mix = { ...sc.mix };
  s.chainPassesPerMonth = sc.chainPassesPerMonth;
  s.fin.churn = sc.churn;
  s.fin.newPerMonth = sc.newPerMonth;
  s.fin.newGrowth = sc.newGrowth;
  s.planChurn = sc.churn;
  commit(s, name);
}

export function reset() {
  const s = structuredClone(DEFAULTS) as State;
  (s as { ccy?: Ccy }).ccy = snapshot.ccy;
  commit(s, 'base');
}

export function loadState(json: string) {
  const parsed = JSON.parse(json) as State;
  commit(parsed, 'custom');
}

export const exportState = () => JSON.stringify(snapshot.s, null, 2);

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
/** Formats in the reader's chosen currency. We charge and earn in dollars and file in
 *  pounds, so both are available; pounds are a conversion at fx.gbpUsd, never a
 *  separate set of figures. */
export function format(v: unknown, f?: string, ccy: Ccy = snapshot.ccy): string {
  return fmt(v, f, { ccy, rate: snapshot.s.fx.gbpUsd }) as string;
}
