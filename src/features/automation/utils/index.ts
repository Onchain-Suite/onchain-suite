import type { Edge, Node } from "reactflow";

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

export const getInitialNodes = (_id: string): Node[] => [];

export const getInitialEdges = (_id: string): Edge[] => [];
