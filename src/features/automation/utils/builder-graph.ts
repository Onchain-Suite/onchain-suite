import { isJsonObject } from "@/lib/utils";

/**
 * The builder's canvas and the backend name node types differently, and the
 * gap is not cosmetic: the backend validates `node.type` against its trigger
 * and action catalogs and rejects anything else with `UNSUPPORTED_NODE_TYPE`.
 *
 * ReactFlow needs a RENDERER key (`trigger`, `tag`, `email`, …) to choose the
 * component; the backend needs the CANONICAL type (`swap_completed`,
 * `add_tag`, `send_email`, …). Sending renderer keys is how a perfectly normal
 * flow came back as "Unsupported node type: trigger".
 *
 * So the canvas keeps renderer keys, and these two functions convert at the
 * wire boundary - `toWireGraph` on the way out, `fromWireNodes` on the way in.
 */

/** Canonical action type → ReactFlow renderer key. */
export const ACTION_RENDERER_BY_TYPE: Record<string, string> = {
  send_email: "email",
  send_inapp: "inapp",
  dispatch_campaign: "dispatch",
  add_tag: "tag",
  remove_tag: "tag",
  add_to_list: "list",
  webhook: "webhook",
  wait: "wait",
  branch: "branch",
};

/** ReactFlow renderer key → canonical action type. */
const CANONICAL_ACTION_BY_RENDERER: Record<string, string> = {
  email: "send_email",
  inapp: "send_inapp",
  dispatch: "dispatch_campaign",
  tag: "add_tag",
  list: "add_to_list",
  webhook: "webhook",
  wait: "wait",
  branch: "branch",
};

/**
 * The trigger and action types the backend's catalogs accept
 * (docs/backend.md → "Live workflow surface"). Only a fallback: the live
 * catalogs are the authority, and `GET /automations/builder/{triggers,actions}`
 * can add to this without a frontend release.
 */
export const KNOWN_TRIGGER_TYPES = [
  "segment_entered",
  "onchain_event",
  "holder_acquired",
  "governance_activity",
  "swap_completed",
  "liquidity_added",
  "borrow_opened",
  "exchange_outflow",
  "capital_withdrawn",
  "liquidation_detected",
  "approval_intent",
  "email_opened",
  "health_threshold",
  // Not in the doc's "Live workflow surface" list, but both have a runtime
  // trigger endpoint of their own (`/automations/runtime/triggers/…`), so the
  // fallback keeps them rather than hiding a working trigger when the catalog
  // fetch fails. The live catalog overrules this either way.
  "form_submitted",
  "list_joined",
  // The DeFi lending trigger. It is absent from both the doc's "Live workflow
  // surface" list AND `GET /automations/builder/triggers`, but the backend
  // validates its config (`INVALID_DEFI_POOL` / `INVALID_DEFI_THRESHOLD`) and
  // runs it on demand (`POST /automations/{id}/defi/health-factor/run`), so it
  // is a real node type the catalog just does not advertise. Keep it here so
  // the graph is never rejected as `UNSUPPORTED_NODE_TYPE` for a supported node.
  "defi_health_factor",
] as const;

export const KNOWN_ACTION_TYPES = [
  "send_email",
  "send_inapp",
  "wait",
  "branch",
  "add_tag",
  "webhook",
  "dispatch_campaign",
] as const;

const asText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/** A node as far as this module cares: a type and a config blob. */
export interface WireNodeLike {
  id?: string;
  type?: string;
  data?: unknown;
  [key: string]: unknown;
}

export interface WireEdgeLike {
  source?: string;
  target?: string;
  [key: string]: unknown;
}

/**
 * The type the BACKEND should see for a node. The canonical type is already
 * carried in the node's data (`nodeType` / `triggerType` / `actionType`) - it
 * was simply never used on the wire.
 */
export const canonicalNodeType = (node: WireNodeLike): string => {
  const data = isJsonObject(node.data) ? node.data : {};
  const rendererType = asText(node.type);

  if (rendererType === "trigger") {
    // A generic on-chain trigger is the only sensible reading of a legacy
    // trigger node that never recorded which preset it came from.
    return asText(data.triggerType) || asText(data.nodeType) || "onchain_event";
  }

  const fromData = asText(data.actionType) || asText(data.nodeType);
  if (fromData.length > 0 && !CANONICAL_ACTION_BY_RENDERER[fromData]) {
    return fromData;
  }
  return (
    CANONICAL_ACTION_BY_RENDERER[rendererType] ?? (fromData || rendererType)
  );
};

/** The renderer key for a node that arrived carrying a canonical type. */
export const rendererNodeType = (node: WireNodeLike): string => {
  const type = asText(node.type);
  if (type.length === 0) return type;
  const data = isJsonObject(node.data) ? node.data : {};
  if (ACTION_RENDERER_BY_TYPE[type]) return ACTION_RENDERER_BY_TYPE[type];
  // Anything the trigger catalog knows renders with the one trigger card.
  if (
    asText(data.triggerType).length > 0 &&
    type === asText(data.triggerType)
  ) {
    return "trigger";
  }
  return type;
};

/**
 * Canvas nodes/edges → the graph the backend validates and stores.
 *
 * Placeholder nodes are dropped along with their edges: they are a canvas
 * affordance ("pick a step here"), have no catalog type, and would come back
 * as `UNSUPPORTED_NODE_TYPE`.
 */
export const toWireGraph = <
  N extends WireNodeLike,
  E extends WireEdgeLike,
>(input: {
  nodes: N[];
  edges: E[];
}): { nodes: N[]; edges: E[] } => {
  const dropped = new Set(
    input.nodes
      .filter((node) => asText(node.type) === "placeholder")
      .map((node) => asText(node.id))
      .filter((id) => id.length > 0)
  );

  const nodes = input.nodes
    .filter((node) => asText(node.type) !== "placeholder")
    .map((node) => {
      const type = canonicalNodeType(node);
      const data = isJsonObject(node.data) ? node.data : {};
      return {
        ...node,
        type,
        // Keep the renderer key so a graph saved by this build reloads onto the
        // same card even if the mapping later changes.
        data: { ...data, rendererType: asText(node.type) || type },
      };
    });

  const edges = input.edges.filter(
    (edge) =>
      !dropped.has(asText(edge.source)) && !dropped.has(asText(edge.target))
  );

  return { nodes, edges };
};

/** Backend nodes → canvas nodes, so every card and config panel keys off the
 *  renderer type exactly as it does for a freshly dragged step. */
export const fromWireNodes = <N extends WireNodeLike>(nodes: N[]): N[] =>
  nodes.map((node) => {
    const data = isJsonObject(node.data) ? node.data : {};
    const stored = asText(data.rendererType);
    return {
      ...node,
      type: stored.length > 0 ? stored : rendererNodeType(node),
      // Preserve the canonical type: it is what the backend keys off, and what
      // tells a preset trigger apart from the generic one.
      data: {
        ...data,
        nodeType: asText(data.nodeType) || canonicalNodeType(node),
      },
    };
  });
