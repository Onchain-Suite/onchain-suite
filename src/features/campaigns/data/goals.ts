import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CurrencyDollarIcon,
  LockClosedIcon,
  MegaphoneIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";

import type { CreateGoalPayload, OnchainAction } from "../contracts/goals";

/** The goal ids the 2.7 picker offers. */
export type CampaignGoalId =
  "mint" | "buy" | "stake" | "bridge" | "return" | "none";

export interface GoalOption {
  id: CampaignGoalId;
  label: string;
  /** How it reads in a sentence, e.g. "minted". */
  verb: string;
  /** Attribution window in days (0 = awareness only). */
  windowDays: number;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** The on-chain action this goal measures, when it maps to one. */
  action?: OnchainAction;
  /**
   * Whether the backend can measure this goal today. "Return to app" is an app
   * event (not on-chain) and its source is not wired yet, so it is shown but
   * not selectable until that lands.
   */
  supported: boolean;
}

/**
 * The 2.7 conversion-goal catalog. Ported from the reference `GOALS`, mapped to
 * the backend: Mint/Purchase/Stake/Bridge become `onchain_action` goals
 * measured against `onchain_events`; "No goal" tracks nothing; "Return to app"
 * awaits its app-event source.
 */
export const GOALS: GoalOption[] = [
  {
    id: "mint",
    label: "Mint",
    verb: "minted",
    windowDays: 7,
    Icon: SparklesIcon,
    action: "mint",
    supported: true,
  },
  {
    id: "buy",
    label: "Purchase",
    verb: "bought",
    windowDays: 7,
    Icon: CurrencyDollarIcon,
    action: "swap",
    supported: true,
  },
  {
    id: "stake",
    label: "Stake",
    verb: "staked",
    windowDays: 14,
    Icon: LockClosedIcon,
    action: "stake",
    supported: true,
  },
  {
    id: "bridge",
    label: "Bridge",
    verb: "bridged",
    windowDays: 14,
    Icon: ArrowsRightLeftIcon,
    action: "bridge",
    supported: true,
  },
  {
    id: "return",
    label: "Return to app",
    verb: "came back",
    windowDays: 3,
    Icon: ArrowPathIcon,
    supported: false,
  },
  {
    id: "none",
    label: "No goal (awareness only)",
    verb: "engaged",
    windowDays: 0,
    Icon: MegaphoneIcon,
    supported: true,
  },
];

export const goalById = (id: string): GoalOption =>
  GOALS.find((g) => g.id === id) ?? GOALS[GOALS.length - 1];

/**
 * Translate a picked goal id into the backend create payload, or `null` when no
 * goal should be persisted ("none", or an unsupported goal). Pure - unit tested.
 */
export function goalToPayload(id: CampaignGoalId): CreateGoalPayload | null {
  const goal = goalById(id);
  if (!goal.supported || !goal.action) return null;
  return {
    name: goal.label,
    conversionType: "onchain_action",
    conversionConfig: { action: goal.action },
    attributionWindowDays: goal.windowDays,
  };
}

/**
 * Infer the picked goal id from a persisted goal's conversionConfig action, so
 * the picker rehydrates to what was saved. Falls back to "none".
 */
export function goalIdFromAction(action: unknown): CampaignGoalId {
  const found = GOALS.find((g) => g.action && g.action === action);
  return found?.id ?? "none";
}
