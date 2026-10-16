import { describe, expect, it } from "vitest";

import { canonicalNodeType, fromWireNodes, toWireGraph } from "./builder-graph";

describe("canonicalNodeType", () => {
  it("maps the canvas renderer key to the type the catalogs know", () => {
    // This is the whole bug: `trigger` and `tag` are renderer keys, and the
    // backend answers UNSUPPORTED_NODE_TYPE for both.
    expect(
      canonicalNodeType({
        type: "trigger",
        data: { triggerType: "swap_completed" },
      })
    ).toBe("swap_completed");
    expect(
      canonicalNodeType({ type: "tag", data: { actionType: "add_tag" } })
    ).toBe("add_tag");
    expect(
      canonicalNodeType({ type: "email", data: { actionType: "send_email" } })
    ).toBe("send_email");
    expect(canonicalNodeType({ type: "list", data: {} })).toBe("add_to_list");
    expect(canonicalNodeType({ type: "dispatch", data: {} })).toBe(
      "dispatch_campaign"
    );
  });

  it("leaves types that are already canonical alone", () => {
    expect(
      canonicalNodeType({
        type: "send_inapp",
        data: { actionType: "send_inapp" },
      })
    ).toBe("send_inapp");
    expect(canonicalNodeType({ type: "wait", data: {} })).toBe("wait");
    expect(canonicalNodeType({ type: "branch", data: {} })).toBe("branch");
  });

  it("reads a legacy trigger with no recorded preset as the generic one", () => {
    expect(canonicalNodeType({ type: "trigger", data: {} })).toBe(
      "onchain_event"
    );
  });
});

describe("toWireGraph", () => {
  it("converts every node to its catalog type", () => {
    const { nodes } = toWireGraph({
      nodes: [
        { id: "t1", type: "trigger", data: { triggerType: "swap_completed" } },
        { id: "a1", type: "tag", data: { actionType: "add_tag", tag: "x" } },
      ],
      edges: [{ source: "t1", target: "a1" }],
    });

    expect(nodes.map((n) => n.type)).toEqual(["swap_completed", "add_tag"]);
    // Config survives the conversion untouched.
    expect(nodes[1].data).toMatchObject({ tag: "x" });
  });

  it("drops placeholder nodes and any edge touching them", () => {
    const { nodes, edges } = toWireGraph({
      nodes: [
        { id: "t1", type: "trigger", data: { triggerType: "holder_acquired" } },
        { id: "p1", type: "placeholder", data: {} },
      ],
      edges: [
        { source: "t1", target: "p1" },
        { source: "t1", target: "t1" },
      ],
    });

    expect(nodes.map((n) => n.id)).toEqual(["t1"]);
    expect(edges).toEqual([{ source: "t1", target: "t1" }]);
  });

  it("round-trips back onto the same canvas card", () => {
    const canvas = [
      { id: "t1", type: "trigger", data: { triggerType: "swap_completed" } },
      { id: "a1", type: "tag", data: { actionType: "add_tag" } },
      { id: "a2", type: "inapp", data: { actionType: "send_inapp" } },
    ];
    const { nodes } = toWireGraph({ nodes: canvas, edges: [] });

    expect(fromWireNodes(nodes).map((n) => n.type)).toEqual([
      "trigger",
      "tag",
      "inapp",
    ]);
  });
});

describe("fromWireNodes", () => {
  it("renders a graph saved by an older build, which stored canonical types", () => {
    const nodes = fromWireNodes([
      {
        id: "t1",
        type: "swap_completed",
        data: { triggerType: "swap_completed" },
      },
      { id: "a1", type: "add_tag", data: {} },
      { id: "a2", type: "dispatch_campaign", data: {} },
    ]);

    expect(nodes.map((n) => n.type)).toEqual(["trigger", "tag", "dispatch"]);
    // The canonical type stays available for everything that keys off it.
    expect(nodes[0].data).toMatchObject({ nodeType: "swap_completed" });
  });
});
