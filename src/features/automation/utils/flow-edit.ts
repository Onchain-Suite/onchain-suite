import type {
  FlowEdgeLike,
  FlowNodeLike,
  FlowPath,
  FlowTree,
  Slot,
} from "./flow-tree";
import { pathNodeIds } from "./flow-tree";

/**
 * Changing the automation graph at the places the canvas offers: insert a
 * step on a slot, remove a step and close the gap, move a step to another
 * slot. Pure; the caller supplies how a new edge is built so the builder's
 * edge styling stays in one place.
 */

export interface Graph<N extends FlowNodeLike, E extends FlowEdgeLike> {
  nodes: N[];
  edges: E[];
}

export type MakeEdge<E> = (
  source: string,
  target: string,
  handle: string | null
) => E;

/** Points every slot's edge at `id` (or adds one for an open end), then `id` on to what followed. */
function wireIn<N extends FlowNodeLike, E extends FlowEdgeLike>(
  g: Graph<N, E>,
  id: string,
  slots: Slot[],
  outHandles: (string | null)[],
  makeEdge: MakeEdge<E>
): Graph<N, E> {
  const bySlot = new Map(
    slots.filter((s) => s.edgeId).map((s) => [s.edgeId, s])
  );
  const edges = g.edges.map((e) =>
    bySlot.has(e.id) ? { ...e, target: id } : e
  );
  for (const s of slots) {
    if (!s.edgeId) edges.push(makeEdge(s.source, id, s.handle));
  }
  const next = slots.find((s) => s.target)?.target ?? null;
  if (next) for (const h of outHandles) edges.push(makeEdge(id, next, h));
  return { nodes: g.nodes, edges };
}

/**
 * A new step at `slots`. A branch inserted mid-flow keeps what followed after
 * its join: both of its paths start empty and lead straight there.
 */
export function insertStep<N extends FlowNodeLike, E extends FlowEdgeLike>(
  g: Graph<N, E>,
  node: N,
  slots: Slot[],
  makeEdge: MakeEdge<E>
): Graph<N, E> {
  const withNode = { nodes: [...g.nodes, node], edges: g.edges };
  return wireIn(
    withNode,
    node.id,
    slots,
    node.type === "branch" ? ["yes", "no"] : [null],
    makeEdge
  );
}

/** Takes a plain step out and joins what came before it to what came after. */
function detach<N extends FlowNodeLike, E extends FlowEdgeLike>(
  g: Graph<N, E>,
  id: string
): Graph<N, E> {
  const next = g.edges.find((e) => e.source === id)?.target ?? null;
  const edges = g.edges
    .filter((e) => e.source !== id)
    .flatMap((e) =>
      e.target !== id
        ? [e]
        : next && next !== e.source
          ? [{ ...e, target: next }]
          : []
    );
  return { nodes: g.nodes, edges };
}

/** The step a branch's paths lead to once they meet, if they do. */
export function branchJoin(path: FlowPath, branchId: string): string | null {
  for (const s of path.steps) {
    if (s.item.kind !== "branch") continue;
    if (s.item.id === branchId) {
      return (
        s.item.paths.flatMap((p) => p.path.tails).find((t) => t.target)
          ?.target ?? null
      );
    }
    for (const p of s.item.paths) {
      const found = branchJoin(p.path, branchId);
      if (found !== null) return found;
    }
  }
  return null;
}

/** The steps inside a branch's paths, which go with it when it is removed. */
export function branchContents(
  path: FlowPath,
  branchId: string
): string[] | null {
  for (const s of path.steps) {
    if (s.item.kind !== "branch") continue;
    if (s.item.id === branchId)
      return s.item.paths.flatMap((p) => pathNodeIds(p.path));
    for (const p of s.item.paths) {
      const found = branchContents(p.path, branchId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Removes a step and closes the gap. A branch goes with everything inside its
 * paths, and what came before it then leads to where the paths met.
 */
export function removeStep<N extends FlowNodeLike, E extends FlowEdgeLike>(
  g: Graph<N, E>,
  id: string,
  tree: FlowTree
): Graph<N, E> {
  const node = g.nodes.find((n) => n.id === id);
  if (!node) return g;
  if (node.type !== "branch") {
    const d = detach(g, id);
    return { nodes: d.nodes.filter((n) => n.id !== id), edges: d.edges };
  }
  const gone = new Set([id, ...(branchContents(tree.path, id) ?? [])]);
  const join = branchJoin(tree.path, id);
  const edges = g.edges
    .filter((e) => !gone.has(e.source))
    .flatMap((e) =>
      !gone.has(e.target) ? [e] : join ? [{ ...e, target: join }] : []
    );
  return { nodes: g.nodes.filter((n) => !gone.has(n.id)), edges };
}

/** Moves a plain step to `slots`; a branch moves with its paths, so it stays put. */
export function moveStep<N extends FlowNodeLike, E extends FlowEdgeLike>(
  g: Graph<N, E>,
  id: string,
  slots: Slot[],
  makeEdge: MakeEdge<E>
): Graph<N, E> {
  const node = g.nodes.find((n) => n.id === id);
  if (!node || node.type === "branch") return g;
  if (slots.some((s) => s.source === id || s.target === id)) return g;
  const d = detach(g, id);
  // Detaching re-pointed edges in place, so a slot's edge id still names the
  // edge it meant; its target is read fresh from the graph.
  const fresh = slots.map((s) => {
    const e = s.edgeId ? d.edges.find((x) => x.id === s.edgeId) : undefined;
    return e ? { ...s, target: e.target } : s;
  });
  return wireIn(d, id, fresh, [null], makeEdge);
}

/** The path a step sits on, and where on it. */
function findOnPath(
  path: FlowPath,
  id: string
): { path: FlowPath; index: number } | null {
  const index = path.steps.findIndex((s) => s.item.id === id);
  if (index >= 0) return { path, index };
  for (const s of path.steps) {
    if (s.item.kind !== "branch") continue;
    for (const p of s.item.paths) {
      const found = findOnPath(p.path, id);
      if (found) return found;
    }
  }
  return null;
}

/** Can a step move one place up (-1) or down (1) on its own path? */
export function canNudge(tree: FlowTree, id: string, dir: -1 | 1): boolean {
  const at = findOnPath(tree.path, id);
  if (!at || at.path.steps[at.index].item.kind === "branch") return false;
  const to = at.index + dir;
  return to >= 0 && to < at.path.steps.length;
}

/**
 * Moves a plain step one place up or down its own path, past the step next
 * to it. A branch next to it counts as one step, paths and all.
 */
export function nudgeStep<N extends FlowNodeLike, E extends FlowEdgeLike>(
  g: Graph<N, E>,
  id: string,
  dir: -1 | 1,
  tree: FlowTree,
  makeEdge: MakeEdge<E>
): Graph<N, E> {
  const at = findOnPath(tree.path, id);
  if (!at || !canNudge(tree, id, dir)) return g;
  const { path, index } = at;
  // Up: just above the step before it. Down: just below the step after it.
  const slots =
    dir === -1
      ? path.steps[index - 1].slots
      : (path.steps[index + 2]?.slots ?? path.tails);
  return moveStep(g, id, slots, makeEdge);
}
