import type { PushCredential } from "@/features/settings/push-credentials.service";
import {
  inAppHasPublishableKey,
  type InAppStatus,
} from "@/features/settings/utils/inapp-status";

/**
 * "unknown" means we couldn't read the setup (e.g. a non-admin sender gets a 403
 * on the credentials/status endpoints). It is deliberately NOT treated as
 * "not ready": the backend is the final authority on a send, so we only hard
 * signal a channel we positively know is unconfigured.
 */
export type ReadinessState = "ready" | "not-ready" | "unknown";

export interface InAppReadiness {
  /** Web SDK delivery (modal/banner/slide-in/inline placements). */
  web: { state: ReadinessState; hasKey: boolean; hasOrigin: boolean };
  /** OS notification delivery (mobile-push placement). */
  mobile: {
    state: ReadinessState;
    apnsVerified: boolean;
    fcmVerified: boolean;
  };
}

export interface ReadinessInput {
  status: InAppStatus | null;
  originCount: number | null;
  credentials: PushCredential[] | null;
  /** False when the status/origins read failed (permission or network). */
  statusKnown: boolean;
  /** False when the push-credentials read failed. */
  credentialsKnown: boolean;
}

export const computeInAppReadiness = ({
  status,
  originCount,
  credentials,
  statusKnown,
  credentialsKnown,
}: ReadinessInput): InAppReadiness => {
  const hasKey = status ? inAppHasPublishableKey(status) : false;
  const hasOrigin = (originCount ?? 0) > 0;
  const web = {
    hasKey,
    hasOrigin,
    state: !statusKnown
      ? ("unknown" as const)
      : hasKey && hasOrigin
        ? ("ready" as const)
        : ("not-ready" as const),
  };

  const apnsVerified = Boolean(
    credentials?.some((c) => c.provider === "apns" && c.verified)
  );
  const fcmVerified = Boolean(
    credentials?.some((c) => c.provider === "fcm" && c.verified)
  );
  const mobile = {
    apnsVerified,
    fcmVerified,
    state: !credentialsKnown
      ? ("unknown" as const)
      : apnsVerified || fcmVerified
        ? ("ready" as const)
        : ("not-ready" as const),
  };

  return { web, mobile };
};

/**
 * Whether the chosen placement can be delivered. Only a channel we positively
 * know is unconfigured ("not-ready") blocks; "unknown" and "ready" both pass so
 * we never trap a sender out of a send the backend would actually accept.
 */
export const placementDeliverable = (
  readiness: InAppReadiness,
  isMobile: boolean
): boolean => {
  const state = isMobile ? readiness.mobile.state : readiness.web.state;
  return state !== "not-ready";
};
