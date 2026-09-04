/**
 * Automation builder trigger/action catalog: the pure data + helpers that turn
 * the backend catalog (`GET /automations/builder/{triggers,actions}`) plus our
 * curated copy into the palette the builder renders.
 *
 * Extracted from `create-automations.tsx` (CLAUDE.md 15.5) - no React, no
 * network, so it is unit-testable on its own. JSX-bound pieces (icon maps,
 * `LibraryIcon`, `RECIPE_ICONS`) stay in the component.
 */

/**
 * Trigger types that are NOT on-chain (so they don't get a contract/event
 * placeholder). Everything else in the trigger catalog - `onchain_event` and the
 * business presets like `holder_acquired` - is treated as on-chain.
 */
export const NON_ONCHAIN_TRIGGER_TYPES = new Set([
  "segment_entered",
  "segment_exited",
  "list_joined",
  "form_submitted",
  "email_opened",
  "email_clicked",
  "tag_added",
  "campaign_completed",
  "health_threshold",
]);

/**
 * Trigger `type`s that fire from on-chain activity - used to split the left
 * palette into "On-chain triggers" vs "Off-chain triggers" (everything else in
 * the trigger catalog, e.g. form_submitted / joined_list / segment_entered).
 */
export const ON_CHAIN_TRIGGER_TYPES = new Set([
  "onchain",
  "trigger",
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
  // Sector-spanning primitives (onchain-backend #315).
  "staked",
  "unstaked",
  "loan_repaid",
  "rewards_claimed",
  "position_opened",
  "position_closed",
  "nft_sold",
  "nft_listed",
  "bridged",
  "large_transfer",
  "supply_change",
  "delegated",
  "attestation",
  // Grouped on-chain (it reads lending positions), but configured by pool +
  // threshold rather than contract + event, so it is routed to its own config
  // panel and excluded from the contract/event fields below.
  "defi_health_factor",
]);

/**
 * The only on-chain triggers where the user picks the raw contract event
 * themselves. The business presets ("Token acquired", "Swap completed", …) have
 * an IMPLIED event: the runtime maps the preset type onto the concrete
 * event(s) + payload filters, so the builder hides the event picker for them
 * and asks for nothing but the contract. Keeps the common case ("notify me when
 * a wallet acquires my token") down to a single input.
 */
export const GENERIC_ONCHAIN_TRIGGER_TYPES = new Set([
  "onchain",
  "trigger",
  "onchain_event",
]);

/**
 * Curated copy (nicer labels/descriptions) for the trigger types the backend
 * catalog exposes - see docs/backend.md `GET /automations/builder/triggers`.
 *
 * This is NOT the source of truth for what the palette shows. The live catalog
 * is (see `triggerCatalog`); this only supplies polished wording and the
 * offline fallback list. So it mirrors the documented trigger set exactly:
 * adding a curated entry does not make a trigger appear if the backend does not
 * support it, and a trigger the backend adds still shows (with its own label)
 * even without an entry here.
 */
export const FIXED_TRIGGERS: {
  type: string;
  label: string;
  description: string;
}[] = [
  {
    type: "onchain_event",
    label: "On-chain event",
    description: "Wallet interacts with a contract",
  },
  {
    type: "holder_acquired",
    label: "Token acquired",
    description: "A wallet acquires your token or NFT",
  },
  {
    type: "swap_completed",
    label: "Swap completed",
    description: "DEX trade or token exchange",
  },
  {
    type: "liquidity_added",
    label: "Liquidity added",
    description: "Deposits into your pools",
  },
  {
    type: "capital_withdrawn",
    label: "Capital withdrawn",
    description: "Burns, unstakes, or withdraws",
  },
  {
    type: "approval_intent",
    label: "Approval intent",
    description: "Approves a contract to spend",
  },
  {
    type: "borrow_opened",
    label: "Borrowed",
    description: "Opens a loan or draws credit",
  },
  {
    type: "liquidation_detected",
    label: "Liquidation",
    description: "A position was liquidated",
  },
  {
    type: "exchange_outflow",
    label: "Exchange outflow",
    description: "Tokens move out to a known exchange wallet",
  },
  {
    type: "governance_activity",
    label: "Governance activity",
    description: "Proposal or vote cast",
  },
  {
    type: "email_opened",
    label: "Email opened",
    description: "A recipient opens one of your emails",
  },
  {
    type: "health_threshold",
    label: "Contact score threshold",
    description: "A contact's score crosses a level you set",
  },
  {
    type: "defi_health_factor",
    label: "Health factor crossed",
    description: "A lending position's health factor drops below your level",
  },
  {
    type: "form_submitted",
    label: "Form submitted",
    description: "Wallet completes a capture form",
  },
  {
    type: "list_joined",
    label: "Joined a list",
    description: "Wallet is added to a list",
  },
  {
    type: "segment_entered",
    label: "Segment entered",
    description: "Wallet joins a saved segment",
  },
];

/** The exact actions offered in the "Add step" grid + library. */
export const FIXED_ACTIONS: {
  type: string;
  label: string;
  description: string;
}[] = [
  {
    type: "send_email",
    label: "Send email",
    description: "Email or reusable template",
  },
  {
    type: "send_inapp",
    label: "Send in-app",
    description: "Push to the matched wallet",
  },
  { type: "wait", label: "Wait", description: "Pause the flow for a duration" },
  {
    type: "branch",
    label: "Branch",
    description: "Split paths on a condition",
  },
  {
    type: "add_tag",
    label: "Add tag",
    description: "Attach a tag to the contact",
  },
  {
    type: "add_to_list",
    label: "Add to list",
    description: "Add the contact to a list",
  },
  { type: "webhook", label: "Webhook", description: "Call an external URL" },
  {
    type: "dispatch_campaign",
    label: "Dispatch campaign",
    description: "Fire an existing campaign",
  },
];

/** One entry from a builder catalog endpoint (`GET /automations/builder/triggers`
 *  or `.../actions`). `label`/`description` are the backend's own, used when we
 *  have no curated copy for that type. */
export type CatalogEntry = {
  type: string;
  label: string;
  description: string;
  /** Present for on-chain presets; see {@link SvmSupport}. */
  svm?: SvmSupport;
};

export const CURATED_TRIGGER_COPY = new Map(
  FIXED_TRIGGERS.map((t) => [t.type, t])
);
export const CURATED_ACTION_COPY = new Map(
  FIXED_ACTIONS.map((a) => [a.type, a])
);

/**
 * Triggers the frontend supports on its own that the live catalog
 * (`GET /automations/builder/triggers`) does not return. `defi_health_factor` is
 * real - the backend validates its config and runs it on demand - it is simply
 * absent from the catalog endpoint, so it is merged into the palette and the
 * supported-types set here rather than depending on the fetch to surface it.
 */
export const CLIENT_TRIGGER_TYPES = ["defi_health_factor"] as const;

/** "health_threshold" -> "Health threshold". Last-resort label when neither the
 *  backend nor the curated copy names a type. */
export const humanizeNodeType = (type: string) =>
  type
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Build the palette from the LIVE backend catalog - the authority on what can
 * actually publish - so every backend trigger/action is offered and nothing the
 * backend doesn't support is. Curated copy supplies polished wording where we
 * have it; otherwise the backend's own label/description (then a humanized type)
 * is used. When the fetch fails, `live` is empty and we render the curated
 * fallback filtered to the known-supported types, so the sidebar is never empty.
 */
export const buildCatalog = (
  live: CatalogEntry[],
  curated: Map<string, { type: string; label: string; description: string }>,
  fallback: { type: string; label: string; description: string }[],
  supportedTypes: Set<string>
): CatalogEntry[] => {
  // First non-empty string: curated copy wins, then the backend's own, then a
  // humanized type. `??` won't do here - the backend often sends `""`, which
  // must fall through, not win.
  const pick = (...vals: string[]) =>
    vals.find((v) => v.trim().length > 0) ?? "";
  if (live.length > 0) {
    return live.map((entry) => {
      const c = curated.get(entry.type);
      return {
        type: entry.type,
        label: pick(c?.label ?? "", entry.label, humanizeNodeType(entry.type)),
        description: pick(c?.description ?? "", entry.description),
      };
    });
  }
  return fallback.filter((entry) => supportedTypes.has(entry.type));
};

/**
 * All canonical trigger `type`s (used to recognize a trigger node whether it was
 * created via drag - renderer key "trigger" - or loaded from a template, where
 * `node.type` is the canonical type like "holder_acquired").
 */
export const TRIGGER_NODE_TYPES = new Set([
  "trigger",
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
  "segment_entered",
  "segment_exited",
  "list_joined",
  "form_submitted",
  "email_opened",
  "email_clicked",
  "tag_added",
  "campaign_completed",
  "health_threshold",
  "defi_health_factor",
]);

/**
 * The goal event a given TRIGGER type would collide with.
 *
 * Every on-chain trigger — holder_acquired, swap_completed, approval_intent and
 * the rest — reaches the runtime as a single `onchain_event`, and every list
 * trigger as `segment_entered`. So the collision is by ingest path, not by card
 * name: a flow triggered on "Holder acquired" with an on-chain goal converts on
 * the very event that enrolled the contact.
 */
export const TRIGGER_TO_GOAL_EVENT: Record<string, string> = {
  onchain_event: "onchain_event",
  holder_acquired: "onchain_event",
  governance_activity: "onchain_event",
  swap_completed: "onchain_event",
  liquidity_added: "onchain_event",
  borrow_opened: "onchain_event",
  exchange_outflow: "onchain_event",
  capital_withdrawn: "onchain_event",
  liquidation_detected: "onchain_event",
  approval_intent: "onchain_event",
  segment_entered: "segment_entered",
  list_joined: "segment_entered",
  form_submitted: "form_submitted",
  email_opened: "email_opened",
  email_clicked: "email_clicked",
};

/**
 * Is this node the flow's trigger? A trigger can arrive three ways, and ALL of
 * them must count or the go-live gate falsely reports MISSING_TRIGGER on a live,
 * configured trigger: the generic trigger card (`type === "trigger"`), a
 * type-specific trigger card whose renderer key IS the trigger type (e.g. a
 * loaded `onchain_event` node rendered by `TriggerNodeA`), or a node that only
 * records the trigger type in its data. `inspectNode` (the orange-dot check) and
 * the go-live issue list must agree, so both call this one helper.
 */
export const nodeIsTrigger = (type?: string, triggerType?: string): boolean =>
  type === "trigger" ||
  TRIGGER_NODE_TYPES.has(type ?? "") ||
  TRIGGER_NODE_TYPES.has(triggerType ?? "");

/**
 * Whether a trigger can run on Solana, as the backend catalog reports it.
 *
 * Mirrors `svmSupportFor` in onchain-backend `svm-trigger-presets.ts` and is
 * READ from `GET /automations/builder/triggers` rather than duplicated here —
 * the program ids are cited to their protocol's own docs, and a second copy
 * that drifts is worse than no copy at all.
 */
export type SvmSupport =
  | {
      supported: true;
      programIds: string[];
      defaultConfig: Record<string, unknown>;
      source: string;
      /** The protocol spans several programs; one binding sees only part. */
      partial?: boolean;
    }
  | { supported: false; reason: string };

/** True for any Solana cluster — mainnet, devnet, localnet. */
export function isSolanaChain(chain: unknown): boolean {
  return (
    typeof chain === "string" && chain.trim().toLowerCase().startsWith("solana")
  );
}

/**
 * The Solana verdict for one trigger on one chain.
 *
 * Returns `null` when the question does not arise — a non-Solana chain, or a
 * trigger the catalog says nothing about. A missing `svm` block is NOT read as
 * "unsupported": an older backend simply does not send one, and greying out
 * every trigger against an old deploy would be a worse failure than letting
 * the publish-time check catch it.
 */
export function solanaVerdict(
  svm: SvmSupport | undefined,
  chain: unknown
): SvmSupport | null {
  if (!isSolanaChain(chain)) return null;
  return svm ?? null;
}
