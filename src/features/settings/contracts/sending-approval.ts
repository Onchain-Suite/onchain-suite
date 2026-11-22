/**
 * Sending approval (backend `modules/sending-approval/API.md`, 2026-11-22).
 * A workspace created after the gate shipped sends at most 500 marketing
 * emails a day until the platform approves it. Bodies are at `data`.
 */

export type SendingApprovalStatus = "pending_review" | "approved" | "rejected";
export type SendingApprovalTier = "standard" | "high_risk";
export type SendingProjectType =
  "protocol" | "exchange" | "wallet" | "nft" | "token_launch" | "other";

export interface SendingApprovalLimits {
  /** Today's org cap from this gate. null = none, 0 = rejected. */
  dailyMarketingCap: number | null;
  pendingDailyMarketingCap: number | null;
  highRiskWarmupMultiplier: number | null;
  highRiskSeedTestAbove: number | null;
  transactionalAffected: boolean;
  /** null when there is no cap. */
  sentToday: number | null;
}

export interface SendingProfile {
  website: string | null;
  projectType: SendingProjectType | null;
  optInSource: string | null;
  sampleDesignId: string | null;
  hasSampleHtml: boolean;
  expectedMonthlyVolume: number | null;
  submittedAt: string | null;
}

/** Field names in `missing[]`. `sampleEmail` = a design id or HTML. */
export type SendingProfileField =
  | "website"
  | "projectType"
  | "optInSource"
  | "sampleEmail"
  | "expectedMonthlyVolume"
  | (string & {});

/** `GET /organization/sending-approval` (any member). */
export interface SendingApproval {
  status: SendingApprovalStatus;
  tier: SendingApprovalTier;
  requiresApproval: boolean;
  grandfathered: boolean;
  limits: SendingApprovalLimits;
  profile: SendingProfile;
  missing: SendingProfileField[];
  /** `reason` only when rejected. */
  review: { reviewedAt: string | null; reason: string | null };
}

/**
 * `PUT /organization/sending-approval` (OWNER/ADMIN). Every field optional,
 * at least one. Returns the GET body; a rejected org that submits goes back
 * to `pending_review`. 400 on a bad URL / project type / empty body.
 */
export interface UpdateSendingProfileBody {
  website?: string;
  projectType?: SendingProjectType;
  /** 10-2000 characters. */
  optInSource?: string;
  sampleDesignId?: string;
  sampleHtml?: string;
  expectedMonthlyVolume?: number;
}
