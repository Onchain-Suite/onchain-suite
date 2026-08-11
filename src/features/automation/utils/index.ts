import { type Connection, type Edge, type Node } from "reactflow";

// Connection validation
export const isValidConnection = (
  connection: Connection,
  nodes: Node[],
  edges: Edge[] = []
): { valid: boolean; message: string } => {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);
  if (!sourceNode || !targetNode)
    return { valid: false, message: "Invalid nodes" };
  if (connection.source === connection.target)
    return { valid: false, message: "Cannot connect to self" };
  if (
    edges.some(
      (edge) =>
        edge.source === connection.source &&
        edge.target === connection.target &&
        (edge.sourceHandle ?? null) === (connection.sourceHandle ?? null) &&
        (edge.targetHandle ?? null) === (connection.targetHandle ?? null)
    )
  ) {
    return { valid: false, message: "These nodes are already connected" };
  }
  if ((targetNode as unknown as { type: string }).type === "trigger")
    return { valid: false, message: "Triggers can only be starting points" };
  if ((sourceNode as unknown as { type: string }).type === "placeholder")
    return { valid: false, message: "Replace placeholder first" };
  if ((targetNode as unknown as { type: string }).type === "placeholder") {
    return {
      valid: false,
      message: "Use the placeholder action picker instead",
    };
  }
  return { valid: true, message: "Valid connection" };
};

// Get automation data based on ID
export const getAutomationData = (id: string) => {
  const isNew = id === "new-id";
  return {
    id,
    name: isNew ? "New Automation" : "Untitled Automation",
    description: "",
    status: "draft",
    reach: 0,
    entries: 0,
    conversions: 0,
    conversionRate: 0,
    revenue: 0,
    createdAt: isNew ? "Just now" : "-",
    lastTriggered: "-",
  };
};

export const autoLayoutNodes = (
  nodes: Node[],

  _newNode: Node
): { x: number; y: number } => {
  if (nodes.length === 0) return { x: 400, y: 50 };

  // Find the lowest node
  const lowestNode = nodes.reduce(
    (lowest, node) => (node.position.y > lowest.position.y ? node : lowest),
    nodes[0]
  );

  // Position new node below the lowest with offset
  return {
    x: lowestNode.position.x,
    y: lowestNode.position.y + 118,
  };
};

export const getInitialNodes = (_id: string): Node[] => [];

export const getInitialEdges = (_id: string): Edge[] => [];
