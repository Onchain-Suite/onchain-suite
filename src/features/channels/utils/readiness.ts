import { CHANNEL_META, CHANNEL_ORDER } from "../data/channels";
import type {
  ChannelId,
  ChannelReadiness,
  ChannelReadinessStatus,
  SocialChannelId,
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
  x: { connected: boolean; pending: boolean };
  /**
   * The remaining social channels. Their send backends are not deployed, so
   * these default to not connected; connect-state is threaded through once each
   * lands.
   */
  social?: Partial<
    Record<
      Exclude<SocialChannelId, "x">,
      { connected: boolean; pending: boolean }
    >
  >;
}

const entry = (
  id: ChannelId,
  status: ChannelReadinessStatus,
  blocker: string | null
): ChannelReadiness => ({ id, label: CHANNEL_META[id].label, status, blocker });

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
  if (domainStatuses.includes("verified"))
    return entry("email", "connected", null);
  if (domainStatuses.includes("pending")) {
    return entry(
      "email",
      "pending",
      "A sending domain is waiting on DKIM and SPF"
    );
  }
  return entry("email", "none", "No verified sending domain");
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
  return entry("push", status, blocker);
}

function socialEntry(
  id: SocialChannelId,
  conn: { connected: boolean; pending: boolean }
): ChannelReadiness {
  if (conn.connected) return entry(id, "connected", null);
  if (conn.pending) {
    return entry(
      id,
      "pending",
      id === "x"
        ? "Authorised. No followers with a linked wallet yet"
        : "Authorised, finishing setup"
    );
  }
  return entry(id, "none", "Not connected yet");
}

/** Every channel's readiness in one list, so the UI never has to know how each
 *  channel's setup works, only whether it is done. */
export function deriveChannelReadiness(
  inputs: ReadinessInputs
): ChannelReadiness[] {
  const byId: Record<ChannelId, ChannelReadiness> = {
    email: emailEntry(inputs.domainStatuses),
    push: pushEntry(
      webPushStatus(inputs.webPush),
      mobilePushStatus(inputs.mobilePush)
    ),
    x: socialEntry("x", inputs.x),
    whatsapp: socialEntry(
      "whatsapp",
      inputs.social?.whatsapp ?? { connected: false, pending: false }
    ),
    telegram: socialEntry(
      "telegram",
      inputs.social?.telegram ?? { connected: false, pending: false }
    ),
    discord: socialEntry(
      "discord",
      inputs.social?.discord ?? { connected: false, pending: false }
    ),
    farcaster: socialEntry(
      "farcaster",
      inputs.social?.farcaster ?? { connected: false, pending: false }
    ),
  };
  return CHANNEL_ORDER.map((id) => byId[id]);
}
