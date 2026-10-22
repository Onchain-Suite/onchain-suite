import { describe, expect, it } from "vitest";

import { insertStep, moveStep, removeStep } from "./flow-edit";
import {
  buildFlowTree,
  type FlowEdgeLike,
  type FlowNodeLike,
  pathNodeIds,
} from "./flow-tree";

const n = (id: string, type = "wait"): FlowNodeLike => ({ id, type });
const e = (
  source: string,
  target: string,
  sourceHandle?: string
): FlowEdgeLike => ({
  id: `${source}>${target}${sourceHandle ? `:${sourceHandle}` : ""}`,
  source,
  target,
  sourceHandle,
});
const isTrigger = (x: FlowNodeLike) => x.type === "trigger";
const tree = (nodes: FlowNodeLike[], edges: FlowEdgeLike[]) =>
  buildFlowTree(nodes, edges, isTrigger);
const mk = (
  source: string,
  target: string,
  handle: string | null
): FlowEdgeLike => ({
  id: `${source}>${target}${handle ? `:${handle}` : ""}`,
  source,
  target,
  sourceHandle: handle,
});
/** The graph as "source>target" lines, sorted, to compare shapes not ids. */
const shape = (edges: FlowEdgeLike[]) =>
  edges
    .map(
      (x) =>
        `${x.source}>${x.target}${x.sourceHandle ? `:${x.sourceHandle}` : ""}`
    )
    .sort();

describe("buildFlowTree", () => {
  it("lays out a straight line from the trigger", () => {
    const t = tree(
      [n("t", "trigger"), n("a"), n("b")],
      [e("t", "a"), e("a", "b")]
    );
    expect(t.root).toBe("t");
    expect(pathNodeIds(t.path)).toEqual(["a", "b"]);
    expect(t.path.tails).toEqual([
      { source: "b", handle: null, target: null, edgeId: null },
    ]);
    expect(t.detached).toEqual([]);
  });

  it("draws a branch's paths and continues where they meet", () => {
    const nodes = [
      n("t", "trigger"),
      n("br", "branch"),
      n("y"),
      n("no1"),
      n("j"),
    ];
    const edges = [
      e("t", "br"),
      e("br", "y", "yes"),
      e("br", "no1", "no"),
      e("y", "j"),
      e("no1", "j"),
    ];
    const t = tree(nodes, edges);
    expect(t.path.steps.map((s) => s.item.id)).toEqual(["br", "j"]);
    const br = t.path.steps[0].item;
    expect(br.kind).toBe("branch");
    if (br.kind !== "branch") return;
    expect(br.paths.map((p) => pathNodeIds(p.path))).toEqual([["y"], ["no1"]]);
    // The step after the branch sits on both paths' ends.
    expect(t.path.steps[1].slots.map((s) => s.source).sort()).toEqual([
      "no1",
      "y",
    ]);
  });

  it("keeps steps nothing reaches", () => {
    const t = tree([n("t", "trigger"), n("a"), n("lost")], [e("t", "a")]);
    expect(t.detached).toEqual(["lost"]);
  });

  it("survives a loop", () => {
    const t = tree(
      [n("t", "trigger"), n("a"), n("b")],
      [e("t", "a"), e("a", "b"), e("b", "a")]
    );
    expect(pathNodeIds(t.path)).toEqual(["a", "b"]);
  });
});

describe("flow edits", () => {
  const base = {
    nodes: [n("t", "trigger"), n("a"), n("b")],
    edges: [e("t", "a"), e("a", "b")],
  };

  it("inserts on an edge and at the open end", () => {
    const t = tree(base.nodes, base.edges);
    const mid = insertStep(base, n("x"), t.path.steps[1].slots, mk);
    expect(shape(mid.edges)).toEqual(["a>x", "t>a", "x>b"]);
    const end = insertStep(base, n("z"), t.path.tails, mk);
    expect(shape(end.edges)).toEqual(["a>b", "b>z", "t>a"]);
  });

  it("inserts a branch whose paths both lead to what followed", () => {
    const t = tree(base.nodes, base.edges);
    const g = insertStep(base, n("br", "branch"), t.path.steps[1].slots, mk);
    expect(shape(g.edges)).toEqual(["a>br", "br>b:no", "br>b:yes", "t>a"]);
    expect(tree(g.nodes, g.edges).path.steps.map((s) => s.item.id)).toEqual([
      "a",
      "br",
      "b",
    ]);
  });

  it("removes a step and closes the gap", () => {
    const g = removeStep(base, "a", tree(base.nodes, base.edges));
    expect(g.nodes.map((x) => x.id)).toEqual(["t", "b"]);
    expect(shape(g.edges)).toEqual(["t>b"]);
  });

  it("removes a branch with its paths, joining to where they met", () => {
    const nodes = [n("t", "trigger"), n("br", "branch"), n("y"), n("j")];
    const edges = [
      e("t", "br"),
      e("br", "y", "yes"),
      e("br", "j", "no"),
      e("y", "j"),
    ];
    const g = removeStep({ nodes, edges }, "br", tree(nodes, edges));
    expect(g.nodes.map((x) => x.id)).toEqual(["t", "j"]);
    expect(shape(g.edges)).toEqual(["t>j"]);
  });

  it("moves a step to another slot", () => {
    const g0 = {
      nodes: [...base.nodes, n("c")],
      edges: [...base.edges, e("b", "c")],
    };
    const t = tree(g0.nodes, g0.edges);
    const g = moveStep(g0, "c", t.path.steps[0].slots, mk);
    expect(pathNodeIds(tree(g.nodes, g.edges).path)).toEqual(["c", "a", "b"]);
  });
});
