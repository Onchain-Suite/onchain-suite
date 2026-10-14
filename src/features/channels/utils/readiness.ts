import type {
  ChannelReadiness,
  ChannelReadinessStatus,
} from "../types/channel";
import type { DomainStatus } from "@/features/settings/components/account/domain-status";

/**
 * Normalized inputs the readiness derivation needs, independent of how each
 * channel's backend is shaped. The hook maps real service data to this; the
 * derivation below is pure so it is unit-tested without rendering or fetching.
 */
export interface ReadinessInputs {
  /** Normalized status of every sending domain. */
  domainStatuses: DomainStatus[];
  webPush: { hasKey: boolean; sessionCount: number | null };
  mobilePush: { hasCredential: boolean; hasVerified: boolean };
  /** X is not built yet (step 3); both false until then. */
  x: { connected: boolean; pending: boolean };
}

/** Web in-app push: the SDK is provisioned once a publishable key exists, and
 *  proven live once it has reported a session. */
export function webPushStatus({
  hasKey,
  sessionCount,
}: ReadinessInputs["webPush"]): ChannelReadinessStatus {
  if (!hasKey) return "none";
  return (sessionCount ?? 0) > 0 ? "connected" : "pending";
}

/** Mobile push: a verified APNs/FCM credential is the strongest signal the app
 *  has today. (The reference also gates on a registered device token; the app
 *  has no such signal yet, so a verified credential reads as connected.) */
export function mobilePushStatus({
  hasCredential,
  hasVerified,
}: ReadinessInputs["mobilePush"]): ChannelReadinessStatus {
  if (hasVerified) return "connected";
  if (hasCredential) return "pending";
  return "none";
}

function emailEntry(domainStatuses: DomainStatus[]): ChannelReadiness {
  if (domainStatuses.includes("verified")) {
    return { id: "email", label: "Email", status: "connected", blocker: null };
  }
  if (domainStatuses.includes("pending")) {
    return {
      id: "email",
      label: "Email",
      status: "pending",
      blocker: "A sending domain is waiting on DKIM and SPF",
    };
  }
  return {
    id: "email",
    label: "Email",
    status: "none",
    blocker: "No verified sending domain",
  };
}

function pushEntry(
  web: ChannelReadinessStatus,
  mobile: ChannelReadinessStatus
): ChannelReadiness {
  const status: ChannelReadinessStatus =
    web === "connected" || mobile === "connected"
      ? "connected"
      : web === "pending" || mobile === "pending"
        ? "pending"
        : "none";

  const blocker =
    status === "connected"
      ? null
      : web === "pending"
        ? "The in-app SDK hasn't reported an active session yet"
        : mobile === "pending"
          ? "A mobile push credential is added but not verified"
          : "In-app push not set up";

  return { id: "push", label: "In-app push", status, blocker };
}

function xEntry(x: ReadinessInputs["x"]): ChannelReadiness {
  const status: ChannelReadinessStatus = x.connected
    ? "connected"
    : x.pending
      ? "pending"
      : "none";
  const blocker =
    status === "connected"
      ? null
      : status === "pending"
        ? "Authorised. No followers with a linked wallet yet"
        : "Not connected";
  return { id: "x", label: "X", status, blocker };
}

/** Every channel's readiness in one list, so the UI never has to know how each
 *  channel's setup works, only whether it is done. */
export function deriveChannelReadiness(
  inputs: ReadinessInputs
): ChannelReadiness[] {
  return [
    emailEntry(inputs.domainStatuses),
    pushEntry(
      webPushStatus(inputs.webPush),
      mobilePushStatus(inputs.mobilePush)
    ),
    xEntry(inputs.x),
  ];
}
