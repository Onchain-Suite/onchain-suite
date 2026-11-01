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
  "welcome-onboard" | "engage-grow" | "keep-winback";

export interface ProtocolTemplateFamilyMeta {
  id: ProtocolTemplateFamily;
  label: string;
  description: string;
  icon: string;
  accent: string;
}

export const protocolTemplateFamilies: ProtocolTemplateFamilyMeta[] = [
  {
    id: "welcome-onboard",
    label: "Welcome and onboard",
    description: "Greet new wallets and subscribers the moment they arrive.",
    icon: "👋",
    accent: "from-emerald-500/20 to-teal-600/10",
  },
  {
    id: "engage-grow",
    label: "Engage and grow",
    description: "Turn on-chain activity and interest into deeper engagement.",
    icon: "📈",
    accent: "from-sky-500/20 to-blue-600/10",
  },
  {
    id: "keep-winback",
    label: "Keep and win back",
    description: "Hold on to wallets going quiet, and bring them back.",
    icon: "💛",
    accent: "from-amber-500/20 to-orange-600/10",
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
      requires?: Array<
        "contract" | "chain" | "segment" | "amount" | "form" | "campaign"
      >;
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

/**
 * The Protocol Play catalog, grouped into three lifecycle families (Welcome and
 * onboard, Engage and grow, Keep and win back). Each Play's trigger carries a
 * REAL `triggerPreset` the runtime enrols on; contract/chain/segment/amount are
 * left blank for the user to fill (see the `triggerPreset` note above). Email
 * `body` is real sendable HTML, not a template name.
 */
export const protocolTemplates: ProtocolTemplate[] = [
  // ── Welcome and onboard ────────────────────────────────────────────────
  {
    id: "welcome-series",
    family: "welcome-onboard",
    name: "Welcome series",
    description:
      "Greet new subscribers over their first week with a warm welcome, a getting-started nudge, and a few tips.",
    icon: "👋",
    estimatedReach: 1840,
    uses: 4120,
    tags: ["Welcome", "Onboarding", "Series"],
    steps: [
      {
        kind: "trigger",
        label: "Joins your list",
        triggerType: "behavior",
        // A list is its backing segment; the runtime enrols on list_joined.
        triggerPreset: "list_joined",
        requires: ["segment"],
        event: "List joined",
        preview: "Fires when a contact joins the list you pick",
      },
      {
        kind: "email",
        label: "Welcome",
        template: "Welcome",
        subject: "Welcome aboard, {{ greeting_name }}",
        body: "<p>Thanks for joining. We are glad you are here.</p><p>Over the next few days we will show you the few things worth doing first.</p>",
        dynamicFields: ["greeting_name"],
      },
      { kind: "wait", duration: "2 days" },
      {
        kind: "email",
        label: "Getting started",
        template: "Getting started",
        subject: "Your first steps, {{ greeting_name }}",
        body: "<p>Three things worth doing in your first week, in order.</p><p>Each takes a few minutes and makes the next one easier.</p>",
        dynamicFields: ["greeting_name"],
      },
      { kind: "wait", duration: "3 days" },
      {
        kind: "email",
        label: "Tips and next steps",
        template: "Tips",
        subject: "A few tips to get more out of this",
        body: "<p>You have the basics down. Here is what regular users do next.</p><p>Reply any time if you get stuck, a real person reads these.</p>",
        dynamicFields: ["greeting_name"],
      },
    ],
  },
  {
    id: "new-holder-onboarding",
    family: "welcome-onboard",
    name: "New holder onboarding",
    description:
      "Welcome wallets the moment they acquire your token and point them to what to do first.",
    icon: "🪙",
    estimatedReach: 1243,
    uses: 2640,
    tags: ["Holders", "Onboarding", "On-chain"],
    steps: [
      {
        kind: "trigger",
        label: "Becomes a holder",
        triggerType: "onchain",
        triggerPreset: "holder_acquired",
        requires: ["contract", "chain"],
        event: "Holder acquired",
        preview: "A wallet receives your token for the first time",
      },
      {
        kind: "email",
        label: "Welcome, holder",
        template: "Holder welcome",
        subject: "Welcome, {{ greeting_name }}",
        body: "<p>You are now a holder. Here is what that unlocks and where to start.</p><p>We will check back in a couple of days with the next step.</p>",
        dynamicFields: ["greeting_name"],
      },
      { kind: "wait", duration: "2 days" },
      {
        kind: "email",
        label: "Make the most of it",
        template: "Holder next steps",
        subject: "Getting the most out of holding, {{ greeting_name }}",
        body: "<p>A quick guide to the perks and tools available to holders.</p><p>Each one takes a minute to set up.</p>",
        dynamicFields: ["greeting_name"],
      },
    ],
  },
  {
    id: "lead-nurture",
    family: "welcome-onboard",
    name: "Lead nurture",
    description:
      "After someone submits a form, warm them up with a short, helpful follow-up sequence.",
    icon: "🌱",
    estimatedReach: 980,
    uses: 1510,
    tags: ["Leads", "Nurture", "Forms"],
    steps: [
      {
        kind: "trigger",
        label: "Submits a form",
        triggerType: "behavior",
        triggerPreset: "form_submitted",
        requires: ["form"],
        event: "Form submitted",
        preview: "Fires when a contact submits the form you pick",
      },
      {
        kind: "email",
        label: "Thanks for reaching out",
        template: "Lead intro",
        subject: "Thanks, {{ greeting_name }} - here is what is next",
        body: "<p>Thanks for getting in touch. Here is a quick overview to get you oriented.</p><p>We will follow up in a few days with more.</p>",
        dynamicFields: ["greeting_name"],
      },
      { kind: "wait", duration: "3 days" },
      {
        kind: "email",
        label: "A deeper look",
        template: "Lead follow-up",
        subject: "A closer look, {{ greeting_name }}",
        body: "<p>Now that you have had a look around, here is the part most people find most useful.</p><p>Happy to answer anything, just reply.</p>",
        dynamicFields: ["greeting_name"],
      },
    ],
  },

  // ── Engage and grow ────────────────────────────────────────────────────
  {
    id: "after-a-purchase",
    family: "engage-grow",
    name: "After a purchase",
    description:
      "Thank wallets after a buy or swap, then follow up a few days later with what to do next.",
    icon: "🛒",
    estimatedReach: 1247,
    uses: 2210,
    tags: ["Purchase", "On-chain", "Post-sale"],
    steps: [
      {
        kind: "trigger",
        label: "Completes a purchase",
        triggerType: "onchain",
        // swap_completed is the closest on-chain proxy for a buy/purchase.
        triggerPreset: "swap_completed",
        requires: ["contract", "chain"],
        event: "Swap completed",
        preview: "A wallet buys or swaps into your token",
      },
      { kind: "wait", duration: "1 hour" },
      {
        kind: "email",
        label: "Thank you",
        template: "Purchase thanks",
        subject: "Thanks for your purchase, {{ greeting_name }}",
        body: "<p>Your transaction went through. Thank you.</p><p>Here is what you can do with it right away.</p>",
        dynamicFields: ["greeting_name"],
      },
      { kind: "wait", duration: "3 days" },
      {
        kind: "email",
        label: "What is next",
        template: "Purchase follow-up",
        subject: "Getting more from it, {{ greeting_name }}",
        body: "<p>A few days in, here is how to get more out of what you bought.</p><p>Short and practical, no fluff.</p>",
        dynamicFields: ["greeting_name"],
      },
    ],
  },
  {
    id: "follow-up-on-interest",
    family: "engage-grow",
    name: "Follow up on interest",
    description:
      "When a contact clicks a link in a campaign, strike while interest is warm with a timely follow-up.",
    icon: "👀",
    estimatedReach: 2156,
    uses: 1980,
    tags: ["Engagement", "Email", "Timely"],
    steps: [
      {
        kind: "trigger",
        label: "Clicks a link",
        triggerType: "behavior",
        triggerPreset: "email_clicked",
        requires: ["campaign"],
        event: "Email clicked",
        preview: "A contact clicks a link in the campaign you pick",
      },
      { kind: "wait", duration: "1 hour" },
      {
        kind: "email",
        label: "Following up",
        template: "Interest follow-up",
        subject: "Saw you were interested, {{ greeting_name }}",
        body: "<p>You clicked through earlier, so here is a bit more on it.</p><p>If it is useful, the next step is right here.</p>",
        dynamicFields: ["greeting_name"],
      },
    ],
  },
  {
    id: "vip-holders",
    family: "engage-grow",
    name: "VIP holders",
    description:
      "When a high-value wallet makes a large transfer, roll out the red carpet with VIP access.",
    icon: "👑",
    estimatedReach: 312,
    uses: 1840,
    tags: ["VIP", "High-value", "On-chain"],
    steps: [
      {
        kind: "trigger",
        label: "Large transfer",
        triggerType: "onchain",
        // Real threshold since backend #460; the amount is the user's to set.
        triggerPreset: "large_transfer",
        requires: ["contract", "chain", "amount"],
        event: "Large transfer",
        preview: "Wallets moving above the amount you set, in one tx",
      },
      { kind: "wait", duration: "1 hour" },
      {
        kind: "email",
        label: "VIP welcome",
        template: "VIP welcome",
        subject: "You're now a VIP, {{ greeting_name }}",
        body: "<p>That transfer puts you among our largest holders. We wanted to say so directly.</p><p>Your VIP access is being set up now, the next email has the details.</p>",
        dynamicFields: ["greeting_name", "portfolio_value"],
      },
      { kind: "wait", duration: "2 days" },
      {
        kind: "email",
        label: "Exclusive access",
        template: "VIP access",
        subject: "Your private access is ready",
        body: "<p>Your VIP access is live. It covers early drops, the private channel, and direct support.</p><p>Reply to this email if anything is missing.</p>",
        dynamicFields: ["greeting_name"],
      },
    ],
  },

  // ── Keep and win back ──────────────────────────────────────────────────
  {
    id: "win-back-quiet-wallets",
    family: "keep-winback",
    name: "Win back quiet wallets",
    description:
      "Re-engage wallets that have gone quiet, escalating to an incentive if they stay cold.",
    icon: "💤",
    estimatedReach: 847,
    uses: 2210,
    tags: ["Win-back", "Re-engagement"],
    steps: [
      {
        kind: "trigger",
        label: "Enters a dormant segment",
        triggerType: "behavior",
        // No inactivity trigger exists; a dormant SEGMENT is how this is built.
        triggerPreset: "segment_entered",
        requires: ["segment"],
        event: "Segment entered",
        preview: "Wallets you have grouped as dormant",
      },
      {
        kind: "email",
        label: "We miss you",
        template: "Win-back intro",
        subject: "We miss you, {{ greeting_name }}",
        body: "<p>It has been a while since your last activity with us.</p><p>Here is what has changed since you were last around.</p>",
        dynamicFields: ["greeting_name", "last_activity"],
      },
      { kind: "wait", duration: "5 days" },
      {
        kind: "email",
        label: "Incentive to return",
        template: "Win-back incentive",
        subject: "A little something to bring you back",
        body: "<p>We saved something for you.</p><p>It is yours whenever you are ready, no deadline attached.</p>",
        dynamicFields: ["greeting_name"],
      },
    ],
  },
  {
    id: "save-a-withdrawal",
    family: "keep-winback",
    name: "Save a withdrawal",
    description:
      "Step in the moment a wallet pulls capital out, with a reason to stay before they are gone.",
    icon: "🛟",
    estimatedReach: 423,
    uses: 760,
    tags: ["Retention", "On-chain", "Save"],
    steps: [
      {
        kind: "trigger",
        label: "Withdraws capital",
        triggerType: "onchain",
        triggerPreset: "capital_withdrawn",
        requires: ["contract", "chain"],
        event: "Capital withdrawn",
        preview: "A wallet withdraws or removes liquidity",
      },
      {
        kind: "email",
        label: "Before you go",
        template: "Save intro",
        subject: "Before you go, {{ greeting_name }}",
        body: "<p>We noticed you pulled funds out, and we would rather ask than assume.</p><p>If something is not working, tell us. If we can fix it, we will.</p>",
        dynamicFields: ["greeting_name"],
      },
    ],
  },
  {
    id: "sunset-unengaged",
    family: "keep-winback",
    name: "Sunset unengaged",
    description:
      "Give unengaged contacts one last, honest check-in before you stop emailing them.",
    icon: "🌇",
    estimatedReach: 1120,
    uses: 540,
    tags: ["Sunset", "List hygiene"],
    steps: [
      {
        kind: "trigger",
        label: "Enters an unengaged segment",
        triggerType: "behavior",
        triggerPreset: "segment_entered",
        requires: ["segment"],
        event: "Segment entered",
        preview: "Contacts you have grouped as unengaged",
      },
      {
        kind: "email",
        label: "Last check-in",
        template: "Sunset check-in",
        subject: "Still want to hear from us, {{ greeting_name }}?",
        body: "<p>We have not seen you open anything in a while, so we want to check.</p><p>Click below to stay subscribed. If not, no hard feelings, we will stop here.</p>",
        dynamicFields: ["greeting_name"],
      },
    ],
  },
];

export const protocolTemplatesByFamily = (family: ProtocolTemplateFamily) =>
  protocolTemplates.filter((t) => t.family === family);
