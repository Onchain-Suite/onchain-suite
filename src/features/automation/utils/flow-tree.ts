/**
 * The automation graph as the builder's canvas draws it: top to bottom, from
 * the trigger, with a branch's Yes and No paths side by side and joined back
 * up where they meet. Nothing is placed by hand: the layout is read off the
 * nodes and edges the backend stores, so any graph it accepts can be drawn.
 *
 * Pure, no React, no ReactFlow: the canvas renders the result and
 * `flow-edit.ts` changes the graph at the slots it names.
 */

export interface FlowNodeLike {
  id: string;
  type?: string;
  data?: unknown;
}

export interface FlowEdgeLike {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

/**
 * A place a step can go: on an edge (`target` set) or at the open end of a
 * path (`target` null). A step after a branch sits on several at once, one
 * per path that reaches it, which is why a position is a list of slots.
 */
export interface Slot {
  source: string;
  handle: string | null;
  target: string | null;
  edgeId: string | null;
}

export type BranchHandle = "yes" | "no";

export type FlowItem =
  | { kind: "step"; id: string }
  | {
      kind: "branch";
      id: string;
      paths: { handle: BranchHandle; path: FlowPath }[];
    };

export interface FlowStep {
  /** Where a step inserted just above this one goes. */
  slots: Slot[];
  item: FlowItem;
}

export interface FlowPath {
  steps: FlowStep[];
  /** The "+" at the end of the path; empty when nothing can follow. */
  tails: Slot[];
}

/** One trigger's own run of first steps, before the shared flow. */
export interface FlowLane {
  root: string;
  path: FlowPath;
}

export interface FlowTree {
  /** The triggers (ways in), OR-joined: a wallet enters when any one fires.
   *  Empty when the flow has none yet. */
  roots: string[];
  /** True when each trigger has its own first steps (the lanes below) before
   *  everyone converges onto `path`. False means one shared flow from the
   *  triggers. Only ever true with more than one trigger. */
  split: boolean;
  /** One lane per trigger when `split`; empty otherwise. A lane runs from its
   *  trigger to the step every trigger reaches (the start of `path`). */
  lanes: FlowLane[];
  /** The shared flow: the whole flow when not split, or what everyone does
   *  once the lanes converge when split. */
  path: FlowPath;
  /** Steps no path reaches, so a hand-wired graph never loses one. */
  detached: string[];
}

export const BRANCH_HANDLES: BranchHandle[] = ["yes", "no"];

/** How many OR-joined triggers one automation may have (mirrors the 2.7 cap). */
export const MAX_TRIGGERS = 3;

const isBranch = (n: FlowNodeLike | undefined) => n?.type === "branch";

/** A branch edge's path. Unlabelled edges fill whichever path is still free. */
function branchEdges(
  edges: FlowEdgeLike[]
): Partial<Record<BranchHandle, FlowEdgeLike>> {
  const out: Partial<Record<BranchHandle, FlowEdgeLike>> = {};
  const loose: FlowEdgeLike[] = [];
  for (const e of edges) {
    if (
      (e.sourceHandle === "yes" || e.sourceHandle === "no") &&
      !out[e.sourceHandle]
    ) {
      out[e.sourceHandle] = e;
    } else loose.push(e);
  }
  for (const e of loose) {
    const free = BRANCH_HANDLES.find((h) => !out[h]);
    if (free) out[free] = e;
  }
  return out;
}

export function buildFlowTree(
  nodes: FlowNodeLike[],
  edges: FlowEdgeLike[],
  isTrigger: (n: FlowNodeLike) => boolean,
  /** Draw each trigger's own first steps before the shared flow. Ignored with
   *  one trigger, where there is nothing to lay side by side. */
  split = false
): FlowTree {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<string, FlowEdgeLike[]>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    out.set(e.source, [...(out.get(e.source) ?? []), e]);
  }

  /** The edge a step continues along, for one handle (null: a plain step). */
  const edgeFrom = (id: string, handle: string | null) => {
    const list = out.get(id) ?? [];
    if (!isBranch(byId.get(id))) return list[0] ?? null;
    return branchEdges(list)[handle as BranchHandle] ?? null;
  };

  /* The main line from a step: itself, then whatever follows it, and past a
     branch, whatever follows its join. Two paths meet at the first step on
     both of their main lines. */
  const spineMemo = new Map<string, string[]>();
  const joinMemo = new Map<string, string | null>();
  const spine = (id: string, guard: Set<string>): string[] => {
    const memo = spineMemo.get(id);
    if (memo) return memo;
    if (guard.has(id)) return [];
    const g = new Set(guard).add(id);
    let rest: string[];
    if (isBranch(byId.get(id))) {
      const j = joinOf(id, g);
      rest = j ? spine(j, g) : [];
    } else {
      const e = edgeFrom(id, null);
      rest = e ? spine(e.target, g) : [];
    }
    const result = [id, ...rest];
    spineMemo.set(id, result);
    return result;
  };
  const joinOf = (id: string, guard: Set<string>): string | null => {
    if (joinMemo.has(id)) return joinMemo.get(id) ?? null;
    const [a, b] = BRANCH_HANDLES.map((h) => edgeFrom(id, h)?.target ?? null);
    let join: string | null = null;
    if (a && b) {
      const onB = new Set(spine(b, guard));
      join = spine(a, guard).find((s) => onB.has(s)) ?? null;
    }
    joinMemo.set(id, join);
    return join;
  };

  const placed = new Set<string>();

  /** Lay out one path, starting on the given slots, until a stop step. */
  const walk = (start: Slot[], stop: Set<string>): FlowPath => {
    const steps: FlowStep[] = [];
    let slots = start;
    for (;;) {
      const target = slots.find((s) => s.target)?.target ?? null;
      // An open end, a join that belongs to an outer path, or a loop back.
      if (!target || stop.has(target) || placed.has(target)) {
        return { steps, tails: slots };
      }
      placed.add(target);
      const node = byId.get(target);
      if (isBranch(node)) {
        const join = joinOf(target, new Set());
        const inner = new Set(stop);
        if (join) inner.add(join);
        const paths = BRANCH_HANDLES.map((handle) => {
          const e = edgeFrom(target, handle);
          const first: Slot = {
            source: target,
            handle,
            target: e?.target ?? null,
            edgeId: e?.id ?? null,
          };
          return { handle, path: walk([first], inner) };
        });
        steps.push({ slots, item: { kind: "branch", id: target, paths } });
        slots = paths.flatMap((p) => p.path.tails);
        // Paths that never meet: whatever follows hangs off every open end.
        if (!join) return { steps, tails: slots };
      } else {
        steps.push({ slots, item: { kind: "step", id: target } });
        const e = edgeFrom(target, null);
        slots = [
          {
            source: target,
            handle: null,
            target: e?.target ?? null,
            edgeId: e?.id ?? null,
          },
        ];
      }
    }
  };

  const roots = nodes.filter(isTrigger).map((n) => n.id);
  for (const r of roots) placed.add(r);
  // A trigger's own entry slot: just that trigger's edge (or none yet). An
  // empty edgeId means the slot has no edge, so pointSlotsAt adds one.
  const entrySlot = (r: string): Slot => {
    const e = edgeFrom(r, null);
    return {
      source: r,
      handle: null,
      target: e?.target ?? null,
      edgeId: e?.id ?? null,
    };
  };

  // Split only makes sense with more than one way in.
  const laned = split && roots.length > 1;

  if (laned) {
    // Each trigger keeps its own lane up to the first step every trigger
    // reaches; from there the flow is shared ("Then everyone"). The triggers
    // behave like a branch's paths that join back up.
    const rootGuard = new Set(roots);
    const laneSpines = roots.map((r) => {
      const e = edgeFrom(r, null);
      return e ? spine(e.target, rootGuard) : [];
    });
    // The join is the first step present on every trigger's main line.
    const others = laneSpines.slice(1).map((l) => new Set(l));
    const join =
      laneSpines[0]?.find((id) => others.every((s) => s.has(id))) ?? null;
    const stop = join ? new Set([join]) : new Set<string>();
    const lanes: FlowLane[] = roots.map((r) => ({
      root: r,
      path: walk([entrySlot(r)], stop),
    }));
    // Everyone's flow starts where the lanes meet: it sits on every lane's open
    // end, so a step added there rewires all of them into it.
    const tails = lanes.flatMap((l) => l.path.tails);
    const path: FlowPath = join
      ? walk(tails, new Set())
      : { steps: [], tails: [] };
    const detached = nodes
      .filter((n) => !placed.has(n.id) && n.type !== "placeholder")
      .map((n) => n.id);
    return { roots, split: true, lanes, path, detached };
  }

  // Not split: one entry slot per trigger, all pointing at the shared first
  // step, so inserting on the first line rewires EVERY trigger into the new
  // step and the triggers stay OR-joined.
  const entry: Slot[] = roots.map(entrySlot);
  const path: FlowPath = entry.length
    ? walk(entry, new Set())
    : { steps: [], tails: [] };
  const detached = nodes
    .filter((n) => !placed.has(n.id) && n.type !== "placeholder")
    .map((n) => n.id);
  return { roots, split: false, lanes: [], path, detached };
}

/** True when the lanes are all empty, so the flow can go back to one shared
 *  line without stranding any step. */
export function canUnsplit(tree: FlowTree): boolean {
  return tree.lanes.every((l) => l.path.steps.length === 0);
}

/** Every step id on a path, nested paths included, in reading order. */
export function pathNodeIds(path: FlowPath): string[] {
  return path.steps.flatMap((s) =>
    s.item.kind === "branch"
      ? [s.item.id, ...s.item.paths.flatMap((p) => pathNodeIds(p.path))]
      : [s.item.id]
  );
}
