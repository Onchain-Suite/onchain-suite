export interface AutomationTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "popular" | "recommended";
  tags?: string[];
  isPopular?: boolean;
}

export interface HelpResource {
  id: string;
  title: string;
  description: string;
  type: "guide" | "video" | "tutorial";
  image: string;
  category: string;
}

export interface AutomationNodeData {
  label: string;
  contract?: string;
  event?: string;
  chain?: string;
  preview?: string;
  duration?: string;
  condition?: string;
  template?: string;
  subject?: string;
  dynamicFields?: string[];
  // Action-node summary fields rendered on the canvas.
  title?: string;
  body?: string;
  tag?: string;
  tags?: string[];
  url?: string;
  method?: string;
  campaignId?: string;
  /** Per-node funnel counts, painted on the canvas by the analytics overlay. */
  stats?: { reached: number; dropped: number; completed: number } | null;
  [key: string]: unknown;
}

export interface AutomationStats {
  date: string;
  entries: number;
  conversions: number;
  revenue: number;
}

export interface AutomationEntry {
  id: string;
  wallet: string;
  email: string;
  timestamp: string;
  outcome: string;
  revenue: number;
  path: string;
}

export interface PathPerformance {
  path: string;
  entries: number;
  conversions: number;
  rate: number;
  revenue: number;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: string;
    contract?: string;
    event: string;
  };
  status: "active" | "paused" | "draft";
  entries: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  lastTriggered: string;
  createdAt: string;
}

export interface Draft {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: string;
    contract?: string;
    event: string;
  };
  lastEdited: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  uses: number;
}
