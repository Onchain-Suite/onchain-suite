import type { AutomationsCreateBody } from "../automation.service";

/**
 * Protocol-aware automation templates.
 *
 * Unlike the generic email-marketing templates, these are built around onchain
 * triggers and produce a complete, ready-to-run flow graph (nodes + edges) that
 * the visual builder and backend both understand. "Use template" creates a real
 * automation via POST /automations with this builder payload.
 */

export type ProtocolTemplateFamily =
  "whale-ltv" | "nft-airdrop" | "churn-winback" | "bridge-onboarding";

export interface ProtocolTemplateFamilyMeta {
  id: ProtocolTemplateFamily;
  label: string;
  description: string;
  icon: string;
  accent: string;
}

export const protocolTemplateFamilies: ProtocolTemplateFamilyMeta[] = [
  {
    id: "whale-ltv",
    label: "Whale & LTV nurture",
    description: "Reward high-value wallets and crossings of value thresholds.",
    icon: "🐳",
    accent: "from-sky-500/20 to-blue-600/10",
  },
  {
    id: "nft-airdrop",
    label: "NFT mint & airdrop",
    description: "Alert holders on mint windows and airdrop eligibility.",
    icon: "🎁",
    accent: "from-violet-500/20 to-fuchsia-600/10",
  },
  {
    id: "churn-winback",
    label: "Churn & win-back",
    description: "Re-engage wallets going quiet before they leave for good.",
    icon: "🔄",
    accent: "from-amber-500/20 to-orange-600/10",
  },
  {
    id: "bridge-onboarding",
    label: "Bridge & onboarding",
    description: "Welcome wallets that bridge in or first touch your contract.",
    icon: "🌉",
    accent: "from-emerald-500/20 to-teal-600/10",
  },
];

/** A single step in a template flow, in builder-ready form. */
export type TemplateStep =
  | {
      kind: "trigger";
      label: string;
      triggerType: "onchain" | "behavior";
      event: string;
      contract?: string;
      chain?: string;
      preview?: string;
    }
  | { kind: "wait"; label?: string; duration: string }
  | {
      kind: "email";
      label?: string;
      template: string;
      subject: string;
      dynamicFields?: string[];
    }
  | {
      kind: "branch";
      label?: string;
      condition: string;
      yes: TemplateStep[];
      no: TemplateStep[];
    };

export interface ProtocolTemplate {
  id: string;
  family: ProtocolTemplateFamily;
  name: string;
  description: string;
  icon: string;
  /** Approximate matching audience used for display only. */
  estimatedReach: number;
  uses: number;
  tags: string[];
  steps: TemplateStep[];
}

export interface FlowNode {
  id: string;
  type: "trigger" | "email" | "wait" | "branch";
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  type: string;
  animated: boolean;
  style: { stroke: string; strokeWidth: number };
  markerEnd: { type: string; color: string };
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

const EDGE_COLORS = {
  default: "#6366f1",
  success: "#10b981",
  danger: "#ef4444",
} as const;

const stepNodeType = (step: TemplateStep): FlowNode["type"] => {
  switch (step.kind) {
    case "trigger":
      return "trigger";
    case "wait":
      return "wait";
    case "branch":
      return "branch";
    default:
      return "email";
  }
};

const stepNodeData = (step: TemplateStep): Record<string, unknown> => {
  switch (step.kind) {
    case "trigger":
      return {
        label: step.label,
        nodeType: step.triggerType,
        event: step.event,
        ...(step.contract ? { contract: step.contract } : {}),
        ...(step.chain ? { chain: step.chain } : {}),
        ...(step.preview ? { preview: step.preview } : {}),
      };
    case "wait":
      return {
        label: step.label ?? "Wait",
        nodeType: "wait",
        duration: step.duration,
      };
    case "branch":
      return {
        label: step.label ?? "Branch",
        nodeType: "branch",
        condition: step.condition,
      };
    case "email":
      return {
        label: step.label ?? step.template,
        nodeType: "send_email",
        template: step.template,
        subject: step.subject,
        ...(step.dynamicFields ? { dynamicFields: step.dynamicFields } : {}),
      };
  }
};

const makeEdge = (
  source: string,
  target: string,
  sourceHandle?: "yes" | "no"
): FlowEdge => {
  const color =
    sourceHandle === "yes"
      ? EDGE_COLORS.success
      : sourceHandle === "no"
        ? EDGE_COLORS.danger
        : EDGE_COLORS.default;
  return {
    id: `e-${source}-${target}${sourceHandle ? `-${sourceHandle}` : ""}`,
    source,
    target,
    ...(sourceHandle ? { sourceHandle } : {}),
    type: "smoothstep",
    animated: true,
    style: { stroke: color, strokeWidth: 2.5 },
    markerEnd: { type: "arrowclosed", color },
  };
};

/**
 * Convert a template's step list into a builder-ready flow graph.
 * Linear steps stack vertically; a branch fans its yes/no paths left/right.
 * `seed` keeps node ids deterministic (useful for tests / SSR stability).
 */
export const buildTemplateGraph = (
  template: ProtocolTemplate,
  seed = 0
): FlowGraph => {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  let counter = 0;
  const nextId = (type: string) => `${type}-${seed}-${counter++}`;

  const COL_X = 400;
  const ROW_GAP = 150;

  const place = (
    steps: TemplateStep[],
    startX: number,
    startY: number,
    parentId: string | null,
    parentHandle?: "yes" | "no"
  ): void => {
    let y = startY;
    let prevId = parentId;
    let prevHandle = parentHandle;

    for (const step of steps) {
      const type = stepNodeType(step);
      const id = nextId(type);
      nodes.push({
        id,
        type,
        position: { x: startX, y },
        data: stepNodeData(step),
      });
      if (prevId) edges.push(makeEdge(prevId, id, prevHandle));
      prevHandle = undefined;
      y += ROW_GAP;

      if (step.kind === "branch") {
        place(step.yes, startX - 220, y, id, "yes");
        place(step.no, startX + 220, y, id, "no");
        return; // branches terminate the linear chain
      }

      prevId = id;
    }
  };

  place(template.steps, COL_X, 50, null);
  return { nodes, edges };
};

/** Build the POST /automations payload from a protocol template. */
export const buildProtocolAutomation = (
  template: ProtocolTemplate,
  seed = 0
): AutomationsCreateBody => {
  const graph = buildTemplateGraph(template, seed);
  const triggerStep = template.steps.find(
    (s): s is Extract<TemplateStep, { kind: "trigger" }> => s.kind === "trigger"
  );

  return {
    name: template.name,
    description: template.description,
    trigger: triggerStep
      ? {
          type: triggerStep.triggerType,
          event: triggerStep.event,
          ...(triggerStep.contract ? { contract: triggerStep.contract } : {}),
          ...(triggerStep.chain ? { chain: triggerStep.chain } : {}),
        }
      : undefined,
    triggerSpec: triggerStep
      ? {
          type: triggerStep.triggerType,
          event: triggerStep.event,
          contract: triggerStep.contract,
          chain: triggerStep.chain,
        }
      : undefined,
    builder: graph,
    flowGraph: graph,
  };
};

export const protocolTemplates: ProtocolTemplate[] = [
  // ── Whale & LTV nurture ────────────────────────────────────────────────
  {
    id: "whale-vip-nurture",
    family: "whale-ltv",
    name: "Whale Wallet VIP Nurture",
    description:
      "When a high-value wallet makes a large transfer, roll out the red carpet with VIP onboarding and exclusive access.",
    icon: "🐳",
    estimatedReach: 312,
    uses: 1840,
    tags: ["High-value", "VIP", "Retention"],
    steps: [
      {
        kind: "trigger",
        label: "Large transfer detected",
        triggerType: "onchain",
        event: "Transfer ≥ $25k",
        contract: "Your Token",
        chain: "All Chains",
        preview: "Wallets moving 25k+ in a single tx",
      },
      { kind: "wait", duration: "1 hour" },
      {
        kind: "email",
        label: "VIP welcome",
        template: "VIP Announcement",
        subject: "You're now a VIP, {{ens_name}}",
        dynamicFields: ["ens_name", "portfolio_value", "ltv"],
      },
      { kind: "wait", duration: "2 days" },
      {
        kind: "email",
        label: "Exclusive access",
        template: "VIP Announcement",
        subject: "Your private access is ready",
        dynamicFields: ["ens_name", "engagement_score"],
      },
    ],
  },
  {
    id: "ltv-milestone-reward",
    family: "whale-ltv",
    name: "LTV Milestone Reward",
    description:
      "Celebrate wallets the moment their lifetime value crosses $5,000 with a personalized reward.",
    icon: "💎",
    estimatedReach: 156,
    uses: 642,
    tags: ["LTV", "Loyalty"],
    steps: [
      {
        kind: "trigger",
        label: "LTV crosses $5,000",
        triggerType: "behavior",
        event: "LTV ≥ $5,000",
        preview: "Wallets passing the $5k lifetime value mark",
      },
      {
        kind: "email",
        label: "Milestone reward",
        template: "VIP Announcement",
        subject: "A reward for reaching the top, {{ens_name}}",
        dynamicFields: ["ens_name", "ltv"],
      },
    ],
  },

  // ── NFT mint & airdrop ─────────────────────────────────────────────────
  {
    id: "nft-mint-live-alert",
    family: "nft-airdrop",
    name: "NFT Mint Live Alert",
    description:
      "The instant your mint opens, notify eligible holders so they don't miss the window.",
    icon: "🎨",
    estimatedReach: 2156,
    uses: 2980,
    tags: ["NFT", "Mint", "Time-sensitive"],
    steps: [
      {
        kind: "trigger",
        label: "Mint window opens",
        triggerType: "onchain",
        event: "Mint Open",
        contract: "Your Collection",
        chain: "Ethereum",
        preview: "Fires when the mint contract goes live",
      },
      {
        kind: "email",
        label: "Mint is live",
        template: "Airdrop Alert",
        subject: "Mint is LIVE, {{ens_name}} — claim your spot",
        dynamicFields: ["ens_name", "last_activity"],
      },
    ],
  },
  {
    id: "airdrop-eligibility-notice",
    family: "nft-airdrop",
    name: "Airdrop Eligibility Notice",
    description:
      "After a snapshot, split eligible vs ineligible wallets — claim instructions for one, a path to qualify for the other.",
    icon: "🪂",
    estimatedReach: 4120,
    uses: 1510,
    tags: ["Airdrop", "Snapshot", "Branching"],
    steps: [
      {
        kind: "trigger",
        label: "Snapshot taken",
        triggerType: "onchain",
        event: "Snapshot",
        contract: "Token Contract",
        chain: "All Chains",
        preview: "Runs after an airdrop snapshot block",
      },
      {
        kind: "branch",
        label: "Eligible?",
        condition: "airdrop_eligible == true",
        yes: [
          {
            kind: "email",
            label: "Claim your airdrop",
            template: "Airdrop Alert",
            subject: "You're eligible, {{ens_name}} — claim now",
            dynamicFields: ["ens_name"],
          },
        ],
        no: [
          {
            kind: "email",
            label: "How to qualify",
            template: "Product Update",
            subject: "Almost there — here's how to qualify next time",
            dynamicFields: ["ens_name"],
          },
        ],
      },
    ],
  },

  // ── Churn & win-back ───────────────────────────────────────────────────
  {
    id: "dormant-holder-winback",
    family: "churn-winback",
    name: "Dormant Holder Win-back",
    description:
      "Re-engage wallets that have held but gone quiet for 30+ days, escalating to an incentive if they stay cold.",
    icon: "💤",
    estimatedReach: 847,
    uses: 2210,
    tags: ["Win-back", "Re-engagement"],
    steps: [
      {
        kind: "trigger",
        label: "Inactive 30 days",
        triggerType: "behavior",
        event: "Inactive ≥ 30 days",
        preview: "Holders with no onchain activity for a month",
      },
      {
        kind: "email",
        label: "We miss you",
        template: "Win-back Campaign",
        subject: "We miss you, {{ens_name}}",
        dynamicFields: ["ens_name", "last_activity"],
      },
      { kind: "wait", duration: "5 days" },
      {
        kind: "email",
        label: "Incentive to return",
        template: "Win-back Campaign",
        subject: "A little something to bring you back",
        dynamicFields: ["ens_name"],
      },
    ],
  },
  {
    id: "pre-churn-intervention",
    family: "churn-winback",
    name: "Pre-Churn Intervention",
    description:
      "Step in the moment a wallet's churn score spikes above 70 with a targeted retention offer.",
    icon: "🚨",
    estimatedReach: 156,
    uses: 980,
    tags: ["Churn", "Retention"],
    steps: [
      {
        kind: "trigger",
        label: "Churn score > 70",
        triggerType: "behavior",
        event: "Churn score > 70",
        preview: "Wallets showing strong churn signals",
      },
      {
        kind: "email",
        label: "Retention offer",
        template: "VIP Announcement",
        subject: "Don't go yet, {{ens_name}}",
        dynamicFields: ["ens_name", "engagement_score"],
      },
    ],
  },

  // ── Bridge & onboarding ────────────────────────────────────────────────
  {
    id: "bridge-welcome-series",
    family: "bridge-onboarding",
    name: "Bridge Welcome Series",
    description:
      "Onboard wallets that bridge to your chain with a 3-touch welcome series spaced over a week.",
    icon: "🌉",
    estimatedReach: 1243,
    uses: 2640,
    tags: ["Onboarding", "Bridge", "Series"],
    steps: [
      {
        kind: "trigger",
        label: "Bridge complete",
        triggerType: "onchain",
        event: "Bridge Complete",
        contract: "Base Bridge",
        chain: "Base",
        preview: "Wallets that just bridged assets in",
      },
      {
        kind: "email",
        label: "Welcome aboard",
        template: "Welcome Series #1",
        subject: "Welcome to the chain, {{ens_name}}",
        dynamicFields: ["ens_name"],
      },
      { kind: "wait", duration: "2 days" },
      {
        kind: "email",
        label: "Getting started",
        template: "Product Update",
        subject: "Your first steps, {{ens_name}}",
        dynamicFields: ["ens_name"],
      },
      { kind: "wait", duration: "3 days" },
      {
        kind: "email",
        label: "Power features",
        template: "Product Update",
        subject: "Ready for the advanced stuff?",
        dynamicFields: ["ens_name", "engagement_score"],
      },
    ],
  },
  {
    id: "first-contract-interaction",
    family: "bridge-onboarding",
    name: "First Contract Interaction",
    description:
      "Greet wallets the first time they interact with your protocol contract.",
    icon: "👋",
    estimatedReach: 1247,
    uses: 1320,
    tags: ["Onboarding", "Activation"],
    steps: [
      {
        kind: "trigger",
        label: "First interaction",
        triggerType: "onchain",
        event: "First Interaction",
        contract: "Your Contract",
        chain: "All Chains",
        preview: "A wallet's very first call to your contract",
      },
      {
        kind: "email",
        label: "Onboarding hello",
        template: "Welcome Series #1",
        subject: "Thanks for trying us, {{ens_name}}",
        dynamicFields: ["ens_name"],
      },
    ],
  },
];

export const protocolTemplatesByFamily = (family: ProtocolTemplateFamily) =>
  protocolTemplates.filter((t) => t.family === family);
