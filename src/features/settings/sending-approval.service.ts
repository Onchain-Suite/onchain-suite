import type { AxiosError } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import type {
  SendingApproval,
  UpdateSendingProfileBody,
} from "./contracts/sending-approval";

export type {
  SendingApproval,
  UpdateSendingProfileBody,
} from "./contracts/sending-approval";

const headers = () => {
  const orgId = getSelectedOrganizationId();
  return {
    ...(orgId ? { "x-org-id": orgId } : {}),
    "x-onchain-silent-error": "1",
  };
};

const unwrap = (payload: unknown): unknown =>
  isJsonObject(payload) && "data" in payload ? payload.data : payload;

const numOrNull = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const strOrNull = (v: unknown) =>
  typeof v === "string" && v.length > 0 ? v : null;

/** Normalise the GET/PUT body. Missing pieces read as "nothing to show". */
export function toSendingApproval(payload: unknown): SendingApproval {
  const o = unwrap(payload);
  const r = isJsonObject(o) ? o : {};
  const limits = isJsonObject(r.limits) ? r.limits : {};
  const profile = isJsonObject(r.profile) ? r.profile : {};
  const review = isJsonObject(r.review) ? r.review : {};
  const status =
    r.status === "approved" || r.status === "rejected"
      ? r.status
      : "pending_review";
  return {
    status,
    tier: r.tier === "high_risk" ? "high_risk" : "standard",
    requiresApproval: r.requiresApproval === true,
    grandfathered: r.grandfathered === true,
    limits: {
      dailyMarketingCap: numOrNull(limits.dailyMarketingCap),
      pendingDailyMarketingCap: numOrNull(limits.pendingDailyMarketingCap),
      highRiskWarmupMultiplier: numOrNull(limits.highRiskWarmupMultiplier),
      highRiskSeedTestAbove: numOrNull(limits.highRiskSeedTestAbove),
      transactionalAffected: limits.transactionalAffected === true,
      sentToday: numOrNull(limits.sentToday),
    },
    profile: {
      website: strOrNull(profile.website),
      projectType:
        (strOrNull(
          profile.projectType
        ) as SendingApproval["profile"]["projectType"]) ?? null,
      optInSource: strOrNull(profile.optInSource),
      sampleDesignId: strOrNull(profile.sampleDesignId),
      hasSampleHtml: profile.hasSampleHtml === true,
      expectedMonthlyVolume: numOrNull(profile.expectedMonthlyVolume),
      submittedAt: strOrNull(profile.submittedAt),
    },
    missing: Array.isArray(r.missing)
      ? r.missing.filter((m): m is string => typeof m === "string")
      : [],
    review: {
      reviewedAt: strOrNull(review.reviewedAt),
      reason: strOrNull(review.reason),
    },
  };
}

/** The backend's message for a 400, or a plain fallback. */
const errorMessage = (e: unknown, fallback: string): string => {
  const data = (e as AxiosError<unknown>)?.response?.data;
  const err =
    isJsonObject(data) && isJsonObject(data.error) ? data.error : null;
  const msg = err?.message ?? (isJsonObject(data) ? data.message : undefined);
  if (typeof msg === "string" && msg && msg !== "An error occurred") return msg;
  if (Array.isArray(msg)) return msg.join(". ");
  return fallback;
};

export const sendingApprovalService = {
  async get(): Promise<SendingApproval> {
    const res = await apiClient.get("/organization/sending-approval", {
      headers: headers(),
    });
    return toSendingApproval(res.data);
  },

  async update(body: UpdateSendingProfileBody): Promise<SendingApproval> {
    try {
      const res = await apiClient.put("/organization/sending-approval", body, {
        headers: headers(),
      });
      return toSendingApproval(res.data);
    } catch (e) {
      throw new Error(
        errorMessage(e, "Couldn't save your sending profile. Try again."),
        { cause: e }
      );
    }
  },
};
