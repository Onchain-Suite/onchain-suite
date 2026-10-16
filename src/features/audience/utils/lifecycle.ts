import type { AudienceProfile } from "../audience.service";
import { profileReach } from "./index";

/**
 * Lifecycle stages (v2.7 audience migration, step 1).
 *
 * The product is named for a lifecycle it did not model: there was a dormant
 * segment and a "goes dormant" trigger, but no stage a wallet occupies. This
 * gives each contact one stage, evaluated in priority order so a contact is
 * never in two at once.
 *
 * FE-first: the stage is DERIVED here from fields the profile already returns
 * (`healthScore`, `engagement`, last-action recency), so it works today without
 * a backend. `reactivated` (dormant -> active again) and stage MOVEMENTS need a
 * backend `stageHistory`, so they are intentionally NOT derived here and stay
 * backend-gated; `reactivated` exists in the type and metadata for when that
 * ships. Pure and server-safe: math + a const map, no React, no network.
 */

export type LifecycleStage =
  "new" | "activated" | "engaged" | "at_risk" | "dormant" | "reactivated";

export type StageTone = "new" | "good" | "warn" | "bad";

export interface StageMeta {
  id: LifecycleStage;
  label: string;
  description: string;
  tone: StageTone;
  /** Left-to-right position on the health axis, for ordering a flow view. */
  order: number;
}

export const STAGES: StageMeta[] = [
  {
    id: "new",
    label: "New",
    description: "First seen recently, nothing since",
    tone: "new",
    order: 0,
  },
  {
    id: "activated",
    label: "Activated",
    description: "Did the thing once: one action beyond arriving",
    tone: "good",
    order: 1,
  },
  {
    id: "engaged",
    label: "Engaged",
    description: "Repeatedly active and reachable",
    tone: "good",
    order: 2,
  },
  {
    id: "reactivated",
    label: "Reactivated",
    description: "Came back after going quiet",
    tone: "good",
    order: 3,
  },
  {
    id: "at_risk",
    label: "At risk",
    description: "Slowing down: health falling, not gone yet",
    tone: "warn",
    order: 4,
  },
  {
    id: "dormant",
    label: "Dormant",
    description: "No activity for 30 days or more",
    tone: "bad",
    order: 5,
  },
];

const STAGE_BY_ID = new Map<LifecycleStage, StageMeta>(
  STAGES.map((s) => [s.id, s])
);

export function stageMeta(id: LifecycleStage): StageMeta {
  return STAGE_BY_ID.get(id) ?? STAGES[1];
}

export interface StageInputs {
  /** 0-100 health score, when the backend has scored the contact. */
  healthScore?: number | null;
  /** Coarse engagement bucket from the backend. */
  engagement?: string | null;
  /** Whole days since the last recorded action; null when unknown. */
  daysSinceActive?: number | null;
  /** First seen recently with nothing since (e.g. carries the "new" tag). */
  isNew?: boolean;
  /** How many channels the contact is reachable on (engaged needs > 0). */
  reachableCount?: number;
  /**
   * The contact's previous stage, when a backend `stageHistory` is available.
   * Only then can `reactivated` (dormant -> active) be told apart from `new`.
   */
  previousStage?: LifecycleStage | null;
}

const DORMANT_DAYS = 30;
const REACTIVATED_WINDOW_DAYS = 7;
const AT_RISK_HEALTH = 34;
const ENGAGED_HEALTH = 67;

/**
 * Decide a contact's current stage. Priority order, first match wins, so the
 * stages partition the audience and counts always sum to the total:
 * dormant -> reactivated -> at_risk -> new -> engaged -> activated.
 */
export function deriveStage(inputs: StageInputs): LifecycleStage {
  const {
    healthScore,
    engagement,
    daysSinceActive,
    isNew,
    reachableCount = 0,
    previousStage,
  } = inputs;

  const days = typeof daysSinceActive === "number" ? daysSinceActive : null;
  const health = typeof healthScore === "number" ? healthScore : null;
  const bucket = (engagement ?? "").toLowerCase();

  if (days !== null && days >= DORMANT_DAYS) return "dormant";
  if (bucket === "cold" && days === null) return "dormant";

  if (
    previousStage === "dormant" &&
    days !== null &&
    days <= REACTIVATED_WINDOW_DAYS
  ) {
    return "reactivated";
  }

  if (health !== null ? health < AT_RISK_HEALTH : bucket === "cooling") {
    return "at_risk";
  }

  if (isNew && (days === null || days <= 14)) return "new";

  if (
    reachableCount > 0 &&
    (health !== null ? health >= ENGAGED_HEALTH : bucket === "active")
  ) {
    return "engaged";
  }

  return "activated";
}

/** Whole days since an ISO/epoch timestamp, or null when unparseable/absent. */
export function daysSince(
  value: unknown,
  nowMs: number = Date.now()
): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((nowMs - t) / 86_400_000));
}

/** Extract the raw last-action timestamp a profile carries, if any. */
function lastActionAt(profile: AudienceProfile): unknown {
  const direct = profile.lastActionAt;
  if (typeof direct === "string" || typeof direct === "number") return direct;
  const la =
    profile.lastAction && typeof profile.lastAction === "object"
      ? (profile.lastAction as Record<string, unknown>)
      : undefined;
  return la?.at ?? la?.time ?? null;
}

/** Derive a stage straight from an {@link AudienceProfile}. */
export function stageForProfile(
  profile: AudienceProfile,
  nowMs: number = Date.now()
): LifecycleStage {
  const tags = Array.isArray(profile.tags)
    ? profile.tags.map((t) => (typeof t === "string" ? t.toLowerCase() : ""))
    : [];
  const reach = profileReach(profile);
  return deriveStage({
    healthScore:
      typeof profile.healthScore === "number" ? profile.healthScore : null,
    engagement:
      typeof profile.engagement === "string" ? profile.engagement : null,
    daysSinceActive: daysSince(lastActionAt(profile), nowMs),
    isNew: tags.includes("new"),
    reachableCount: (reach.email ? 1 : 0) + (reach.push ? 1 : 0),
  });
}
