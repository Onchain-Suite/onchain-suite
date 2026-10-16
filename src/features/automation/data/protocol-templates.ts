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
      /** Display grouping only. `triggerPreset` is what the backend runs. */
      triggerType: "onchain" | "behavior";
      /**
       * The REAL trigger type the runtime knows.
       *
       * Recipes used to emit `triggerType` straight into the payload, so a
       * created automation carried `type: "behavior"` — which no trigger
       * matcher recognises — alongside `contract: "Your Token"` and
       * `chain: "All Chains"`. Those are captions, not configuration: the
       * watch planner rejects both, so applying a recipe produced a draft that
       * could never be published into anything that fires, with no signal
       * beyond nothing ever happening.
       */
      triggerPreset: string;
      /** Shown on the card and left blank in the draft, for the user to pick. */
      requires?: Array<"contract" | "chain" | "segment" | "amount">;
      event: string;
      contract?: string;
      chain?: string;
      preview?: string;
    }
  | { kind: "wait"; label?: string; duration: string }
  | {
      kind: "email";
      label?: string;
      /** Display name for the card. NOT a templateId — the copy lives in `body`. */
      template: string;
      subject: string;
      /**
       * The email itself.
       *
       * Recipes used to carry a template NAME and a subject and nothing else.
       * `executeSendEmailNode` reads `templateId` or `body`; a display name is
       * neither, so every recipe reached its first email step and sent an empty
       * message. A recipe that cannot send is a recipe that does not work.
       *
       * Kept as plain short HTML so it is readable and editable in the builder
       * rather than pointing at a row the user has never seen.
       */
      body: string;
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
        // The real trigger type, so the builder opens the right panel and the
        // runtime recognises it. `triggerType` is display grouping only.
        type: step.triggerPreset,
        nodeType: step.triggerPreset,
        event: step.event,
        // contract/chain are deliberately ABSENT. The template's values are
        // captions ("Your Token", "All Chains") which the watch planner
        // rejects; leaving the fields empty makes the builder prompt for them
        // and the go-live check hold the flow until they are set.
        ...(step.requires?.length ? { requires: step.requires } : {}),
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
        // `template` is the card's display name. The SENDABLE content is
        // `body` — executeSendEmailNode reads templateId or body, and a
        // display name is neither.
        template: step.template,
        subject: step.subject,
        body: step.body,
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
    type: "addable",
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

  // The REAL trigger type, and NOTHING the user has to choose.
  //
  // `contract: "Your Token"` and `chain: "All Chains"` are captions. Sending
  // them produced a draft the watch planner rejects — getAddress() does not
  // accept "Your Token" — so the automation was created, looked configured,
  // and could never bind a watch. Omitting them leaves the field empty, which
  // the builder shows as unset and the go-live check refuses to publish until
  // the user fills in. An empty required field is a prompt; a plausible wrong
  // one is a trap.
  const trigger = triggerStep
    ? { type: triggerStep.triggerPreset, event: triggerStep.event }
    : undefined;

  return {
    name: template.name,
    description: template.description,
    trigger,
    triggerSpec: trigger,
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
        // Real threshold since backend #460; the amount is the user's to set.
        triggerPreset: "large_transfer",
        requires: ["contract", "chain", "amount"],
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
        subject: "You're now a VIP, {{ greeting_name }}",
        body: "<p>That transfer puts you among our largest holders. We wanted to say so directly.</p><p>Your VIP access is being set up now — the next email has the details.</p>",
        dynamicFields: ["greeting_name", "portfolio_value", "ltv"],
      },
      { kind: "wait", duration: "2 days" },
      {
        kind: "email",
        label: "Exclusive access",
        template: "VIP Announcement",
        subject: "Your private access is ready",
        body: "<p>Your VIP access is live. It covers early drops, the private channel, and direct support.</p><p>Reply to this email if anything is missing.</p>",
        dynamicFields: ["greeting_name", "engagement_score"],
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
        // There is no LTV trigger. Entering an LTV-based segment is the honest
        // equivalent, and it is a trigger that exists.
        triggerPreset: "segment_entered",
        requires: ["segment"],
        event: "LTV ≥ $5,000",
        preview: "Wallets passing the $5k lifetime value mark",
      },
      {
        kind: "email",
        label: "Milestone reward",
        template: "VIP Announcement",
        subject: "A reward for reaching the top, {{ greeting_name }}",
        body: "<p>You have crossed a milestone that very few holders reach.</p><p>There is a reward waiting for you. Here is how to claim it.</p>",
        dynamicFields: ["greeting_name", "ltv"],
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
        triggerPreset: "holder_acquired",
        requires: ["contract", "chain"],
        event: "Mint Open",
        contract: "Your Collection",
        chain: "Ethereum",
        preview: "Fires when the mint contract goes live",
      },
      {
        kind: "email",
        label: "Mint is live",
        template: "Airdrop Alert",
        subject: "Mint is LIVE, {{ greeting_name }} - claim your spot",
        body: "<p>The mint window is open.</p><p>Spots are limited and go in order. Claim yours while it is live.</p>",
        dynamicFields: ["greeting_name", "last_activity"],
      },
    ],
  },
  {
    id: "airdrop-eligibility-notice",
    family: "nft-airdrop",
    name: "Airdrop Eligibility Notice",
    description:
      "After a snapshot, split eligible vs ineligible wallets - claim instructions for one, a path to qualify for the other.",
    icon: "🪂",
    estimatedReach: 4120,
    uses: 1510,
    tags: ["Airdrop", "Snapshot", "Branching"],
    steps: [
      {
        kind: "trigger",
        label: "Snapshot taken",
        triggerType: "onchain",
        // A snapshot is an audience, not a chain event.
        triggerPreset: "segment_entered",
        requires: ["segment"],
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
            subject: "You're eligible, {{ greeting_name }} - claim now",
            body: "<p>The snapshot is in, and your wallet qualifies.</p><p>Claim before the window closes — unclaimed allocations do not roll over.</p>",
            dynamicFields: ["greeting_name"],
          },
        ],
        no: [
          {
            kind: "email",
            label: "How to qualify",
            template: "Product Update",
            subject: "Almost there - here's how to qualify next time",
            body: "<p>Your wallet did not qualify for this snapshot. It was close.</p><p>Here is exactly what counts toward the next one, so you are in.</p>",
            dynamicFields: ["greeting_name"],
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
        // No inactivity trigger exists; a dormant SEGMENT is how this is built.
        triggerPreset: "segment_entered",
        requires: ["segment"],
        event: "Inactive ≥ 30 days",
        preview: "Holders with no onchain activity for a month",
      },
      {
        kind: "email",
        label: "We miss you",
        template: "Win-back Campaign",
        subject: "We miss you, {{ greeting_name }}",
        body: "<p>It has been a while since your last on-chain activity with us.</p><p>Here is what has changed since you were last around.</p>",
        dynamicFields: ["greeting_name", "last_activity"],
      },
      { kind: "wait", duration: "5 days" },
      {
        kind: "email",
        label: "Incentive to return",
        template: "Win-back Campaign",
        subject: "A little something to bring you back",
        body: "<p>We saved something for you.</p><p>It is yours whenever you are ready — no deadline attached.</p>",
        dynamicFields: ["greeting_name"],
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
        triggerPreset: "health_threshold",
        event: "Churn score > 70",
        preview: "Wallets showing strong churn signals",
      },
      {
        kind: "email",
        label: "Retention offer",
        template: "VIP Announcement",
        subject: "Don't go yet, {{ greeting_name }}",
        body: "<p>We noticed things have gone quiet, and we would rather ask than assume.</p><p>Tell us what is not working. If we can fix it, we will.</p>",
        dynamicFields: ["greeting_name", "engagement_score"],
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
        // Real since backend #463 — Wormhole core + token bridge.
        triggerPreset: "bridged",
        requires: ["contract", "chain"],
        event: "Bridge Complete",
        contract: "Base Bridge",
        chain: "Base",
        preview: "Wallets that just bridged assets in",
      },
      {
        kind: "email",
        label: "Welcome aboard",
        template: "Welcome Series #1",
        subject: "Welcome to the chain, {{ greeting_name }}",
        body: "<p>Your bridge went through. Your assets are here.</p><p>Here is what to do first, so nothing sits idle.</p>",
        dynamicFields: ["greeting_name"],
      },
      { kind: "wait", duration: "2 days" },
      {
        kind: "email",
        label: "Getting started",
        template: "Product Update",
        subject: "Your first steps, {{ greeting_name }}",
        body: "<p>Three things worth doing in your first week, in order.</p><p>Each takes a few minutes and makes the next one easier.</p>",
        dynamicFields: ["greeting_name"],
      },
      { kind: "wait", duration: "3 days" },
      {
        kind: "email",
        label: "Power features",
        template: "Product Update",
        subject: "Ready for the advanced stuff?",
        body: "<p>You have the basics down. This is where it gets more interesting.</p><p>Here is what experienced holders do next.</p>",
        dynamicFields: ["greeting_name", "engagement_score"],
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
        triggerPreset: "onchain_event",
        requires: ["contract", "chain"],
        event: "First Interaction",
        contract: "Your Contract",
        chain: "All Chains",
        preview: "A wallet's very first call to your contract",
      },
      {
        kind: "email",
        label: "Onboarding hello",
        template: "Welcome Series #1",
        subject: "Thanks for trying us, {{ greeting_name }}",
        body: "<p>Thanks for your first interaction with our contract.</p><p>Here is what to do next, and where to ask if you get stuck.</p>",
        dynamicFields: ["greeting_name"],
      },
    ],
  },
];

export const protocolTemplatesByFamily = (family: ProtocolTemplateFamily) =>
  protocolTemplates.filter((t) => t.family === family);
